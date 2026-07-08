// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — hooks de suivi en direct
// Consommation : Realtime + repli par sondage, commits d'état throttlés
// (max 1 re-render / 2 s) et protégés par le pattern isMounted — aucun
// setState ni timer ne survit au démontage de l'écran.
// Publication : expo-location côté transporteur assigné.
// ──────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { IS_LIVE } from '../services/supabase';
import * as api from '../services/api';
import { getRoutePath, pointAlongPath } from '../services/routeCache';
import { GeoPoint, Shipment, ShipmentLocation, ShipmentStatus } from '../types';

const COMMIT_THROTTLE_MS = 2000; // coalesce les rafales Realtime
const POLL_FALLBACK_MS = 20000; // sondage si le canal Realtime est coupé
const PUBLISH_MIN_INTERVAL_MS = 5000; // au plus une écriture réseau / 5 s
const DEMO_TICK_MS = 3000;

export const TRACKABLE_STATUSES: ShipmentStatus[] = [
  'accepted',
  'collected',
  'in_transit',
  'arrived',
];

const isValidCoord = (p: GeoPoint) =>
  Number.isFinite(p.latitude) &&
  Number.isFinite(p.longitude) &&
  !(p.latitude === 0 && p.longitude === 0);

// ── Consommation : position en direct d'un envoi ──────────────────────────

export function useShipmentLiveLocation(shipment?: Shipment): {
  location: ShipmentLocation | null;
  path: GeoPoint[];
  isRealtime: boolean;
} {
  const [location, setLocation] = useState<ShipmentLocation | null>(null);
  const [path, setPath] = useState<GeoPoint[]>([]);
  const [isRealtime, setIsRealtime] = useState(false);

  const isMounted = useRef(true);
  const realtimeConnected = useRef(false);
  const pendingLocation = useRef<ShipmentLocation | null>(null);
  const lastCommitAt = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
    };
  }, []);

  // Throttle des commits : un flux dense (une position / seconde et plus)
  // ne déclenche qu'un re-render toutes les COMMIT_THROTTLE_MS, la dernière
  // position en attente étant toujours celle qui gagne.
  const commitLocation = useCallback((incoming: ShipmentLocation) => {
    if (!isMounted.current) return;
    const flush = (loc: ShipmentLocation) => {
      if (!isMounted.current) return;
      lastCommitAt.current = Date.now();
      pendingLocation.current = null;
      // Ignore les positions plus anciennes que celle affichée (le sondage
      // de repli peut croiser un événement Realtime).
      setLocation((prev) => (prev && prev.recordedAt > loc.recordedAt ? prev : loc));
    };
    const elapsed = Date.now() - lastCommitAt.current;
    if (elapsed >= COMMIT_THROTTLE_MS) {
      flush(incoming);
      return;
    }
    pendingLocation.current = incoming;
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        if (pendingLocation.current) flush(pendingLocation.current);
      }, COMMIT_THROTTLE_MS - elapsed);
    }
  }, []);

  const shipmentId = shipment?.id;
  const status = shipment?.status;
  const pickupLat = shipment?.pickupAddress.latitude;
  const pickupLng = shipment?.pickupAddress.longitude;
  const deliveryLat = shipment?.deliveryAddress.latitude;
  const deliveryLng = shipment?.deliveryAddress.longitude;

  // Tracé statique de l'itinéraire — calculé une fois, servi depuis le
  // cache AsyncStorage/RAM ensuite (voir routeCache).
  useEffect(() => {
    if (pickupLat == null || pickupLng == null || deliveryLat == null || deliveryLng == null) {
      return;
    }
    const from = { latitude: pickupLat, longitude: pickupLng };
    const to = { latitude: deliveryLat, longitude: deliveryLng };
    if (!isValidCoord(from) || !isValidCoord(to)) return;
    let cancelled = false;
    getRoutePath(from, to)
      .then((points) => {
        if (!cancelled && isMounted.current) setPath(points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  // Mode live : fetch initial groupé + abonnement Realtime + repli sondage.
  useEffect(() => {
    if (!IS_LIVE || !shipmentId || !status || !TRACKABLE_STATUSES.includes(status)) return;
    let cancelled = false;

    const fetchLatest = () => {
      api
        .fetchLatestLocations([shipmentId])
        .then((byId) => {
          const loc = byId[shipmentId];
          if (loc && !cancelled) commitLocation(loc);
        })
        .catch(() => {});
    };
    fetchLatest();

    const unsubscribe = api.subscribeToShipmentLocation(
      shipmentId,
      (loc) => {
        if (!cancelled) commitLocation(loc);
      },
      (connected) => {
        realtimeConnected.current = connected;
        if (!cancelled && isMounted.current) setIsRealtime(connected);
      }
    );

    const poll = setInterval(() => {
      if (!realtimeConnected.current) fetchLatest();
    }, POLL_FALLBACK_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
      unsubscribe();
    };
  }, [shipmentId, status, commitLocation]);

  // Mode démo : simulation d'un véhicule qui avance le long du tracé, pour
  // que l'écran soit testable sans Supabase.
  const transporterId = shipment?.transporterId;
  useEffect(() => {
    if (IS_LIVE || !shipmentId || !status) return;
    if (!['collected', 'in_transit', 'arrived'].includes(status)) return;
    if (path.length < 2) return;

    let fraction = status === 'collected' ? 0.05 : status === 'arrived' ? 0.95 : 0.35;
    const step = status === 'in_transit' ? 0.004 : 0;
    const tick = setInterval(() => {
      if (!isMounted.current) return;
      fraction = Math.min(fraction + step, 0.97);
      const { point, heading } = pointAlongPath(path, fraction);
      setLocation({
        id: 'demo-location',
        shipmentId,
        transporterId: transporterId ?? 'demo',
        latitude: point.latitude,
        longitude: point.longitude,
        heading,
        speed: status === 'in_transit' ? 12 : 0,
        recordedAt: new Date().toISOString(),
      });
    }, DEMO_TICK_MS);
    return () => clearInterval(tick);
  }, [shipmentId, status, transporterId, path]);

  return { location, path, isRealtime };
}

// ── Publication : partage de position par le transporteur ─────────────────

export function useTransporterLocationPublisher(
  shipmentId?: string,
  transporterId?: string
): {
  isSharing: boolean;
  error: string | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
} {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPublishAt = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  const stopSharing = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (isMounted.current) setIsSharing(false);
  }, []);

  const startSharing = useCallback(async () => {
    if (!shipmentId || !transporterId || watchRef.current) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (isMounted.current) setError('Permission de localisation refusée.');
        return;
      }
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 8000,
          distanceInterval: 25,
        },
        (position) => {
          if (Date.now() - lastPublishAt.current < PUBLISH_MIN_INTERVAL_MS) return;
          lastPublishAt.current = Date.now();
          if (!IS_LIVE) return; // démo : la simulation locale fait foi
          api
            .publishShipmentLocation({
              shipmentId,
              transporterId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading:
                position.coords.heading != null && position.coords.heading >= 0
                  ? position.coords.heading
                  : undefined,
              speed:
                position.coords.speed != null && position.coords.speed >= 0
                  ? position.coords.speed
                  : undefined,
              accuracy: position.coords.accuracy ?? undefined,
            })
            .catch(() => undefined); // une position perdue n'est pas critique
        }
      );
      if (!isMounted.current) {
        // L'écran a été quitté pendant la demande de permission.
        subscription.remove();
        return;
      }
      watchRef.current = subscription;
      setError(null);
      setIsSharing(true);
    } catch {
      if (isMounted.current) setError("Impossible d'activer le partage de position.");
    }
  }, [shipmentId, transporterId]);

  return { isSharing, error, startSharing, stopSharing };
}
