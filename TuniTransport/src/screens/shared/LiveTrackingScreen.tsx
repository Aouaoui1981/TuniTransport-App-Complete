// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Suivi en direct sur la carte
// Position du transporteur en temps réel (Realtime + repli sondage), tracé
// orthodromique mis en cache, marqueur véhicule orienté par le cap GPS.
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { statusLabel } from '../../components';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  useShipmentLiveLocation,
  useTransporterLocationPublisher,
  TRACKABLE_STATUSES,
} from '../../hooks/useLiveTracking';
import { RootStackParamList, useAppNavigation } from '../../navigation/AppNavigator';
import { GeoPoint } from '../../types';

// Cadrage Méditerranée par défaut, le temps que le tracé arrive du cache.
const INITIAL_REGION = {
  latitude: 40.5,
  longitude: 7.5,
  latitudeDelta: 14,
  longitudeDelta: 14,
};

const isValidCoord = (p: GeoPoint) =>
  Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && !(p.latitude === 0 && p.longitude === 0);

function relativeTime(iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `il y a ${hours} h`;
}

export default function LiveTrackingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'LiveTracking'>>();
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { getShipmentById } = useData();
  const shipment = getShipmentById(route.params.shipmentId);

  const { location, path, isRealtime } = useShipmentLiveLocation(shipment);
  const isAssignedTransporter =
    !!user && !!shipment && user.role === 'transporter' && shipment.transporterId === user.id;
  const canShare =
    isAssignedTransporter && !!shipment && TRACKABLE_STATUSES.includes(shipment.status);
  const { isSharing, error: shareError, startSharing, stopSharing } =
    useTransporterLocationPublisher(shipment?.id, user?.id);

  // Horloge pour le libellé « il y a X s » — nettoyée au démontage.
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(tick);
  }, []);

  const mapRef = useRef<MapView | null>(null);
  const didFitRef = useRef(false);

  const pickupCoord = useMemo(
    () =>
      shipment
        ? {
            latitude: shipment.pickupAddress.latitude,
            longitude: shipment.pickupAddress.longitude,
          }
        : null,
    [shipment?.pickupAddress.latitude, shipment?.pickupAddress.longitude]
  );
  const deliveryCoord = useMemo(
    () =>
      shipment
        ? {
            latitude: shipment.deliveryAddress.latitude,
            longitude: shipment.deliveryAddress.longitude,
          }
        : null,
    [shipment?.deliveryAddress.latitude, shipment?.deliveryAddress.longitude]
  );

  // Cadre la carte sur l'itinéraire dès que le tracé est disponible.
  useEffect(() => {
    if (didFitRef.current || path.length < 2) return;
    didFitRef.current = true;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(path, {
        edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
        animated: false,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [path]);

  const recenterOnVehicle = () => {
    if (!location) return;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      },
      500
    );
  };

  if (!shipment) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Envoi introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const speedKmh = location?.speed != null ? Math.round(location.speed * 3.6) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Suivi en direct</Text>
          <Text style={styles.subtitle}>
            {shipment.pickupAddress.city} → {shipment.deliveryAddress.city}
          </Text>
        </View>
        <View style={[styles.liveBadge, isRealtime ? styles.liveBadgeOn : styles.liveBadgeOff]}>
          <View style={[styles.liveDot, { backgroundColor: isRealtime ? COLORS.success : COLORS.accent }]} />
          <Text style={styles.liveBadgeText}>{isRealtime ? 'En direct' : 'Différé'}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION}>
          {path.length >= 2 ? (
            <Polyline
              coordinates={path}
              strokeColor={COLORS.primary}
              strokeWidth={2.5}
              lineDashPattern={[8, 6]}
            />
          ) : null}
          {pickupCoord && isValidCoord(pickupCoord) ? (
            <Marker
              coordinate={pickupCoord}
              title={shipment.pickupAddress.city}
              description="Point de collecte"
              pinColor={COLORS.primary}
            />
          ) : null}
          {deliveryCoord && isValidCoord(deliveryCoord) ? (
            <Marker
              coordinate={deliveryCoord}
              title={shipment.deliveryAddress.city}
              description="Point de livraison"
              pinColor={COLORS.secondary}
            />
          ) : null}
          {location ? (
            <Marker
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              title={shipment.transporterName ?? 'Transporteur'}
              description={`Position ${relativeTime(location.recordedAt, nowMs)}`}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={location.heading ?? 0}
              flat
            >
              <View style={styles.vehicleMarker}>
                <Ionicons name="navigate" size={18} color={COLORS.white} />
              </View>
            </Marker>
          ) : null}
        </MapView>

        {location ? (
          <TouchableOpacity style={styles.recenterFab} onPress={recenterOnVehicle}>
            <Ionicons name="locate" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Info panel */}
      <View style={styles.panel}>
        <View style={styles.panelRow}>
          <View style={styles.panelIcon}>
            <Ionicons name="boat" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelStatus}>{statusLabel(shipment.status)}</Text>
            <Text style={styles.panelMeta}>
              {location
                ? `Position mise à jour ${relativeTime(location.recordedAt, nowMs)}` +
                  (speedKmh != null && speedKmh > 0 ? ` · ${speedKmh} km/h` : '')
                : TRACKABLE_STATUSES.includes(shipment.status)
                ? 'En attente de la position du transporteur…'
                : 'Le suivi en direct démarre après la prise en charge.'}
            </Text>
          </View>
        </View>

        {canShare ? (
          <View style={styles.shareRow}>
            <Ionicons name="radio-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.shareLabel}>Partager ma position</Text>
            <Switch
              value={isSharing}
              onValueChange={(next) => (next ? startSharing() : stopSharing())}
              trackColor={{ true: COLORS.secondaryLight, false: undefined }}
              thumbColor={isSharing ? COLORS.secondary : undefined}
            />
          </View>
        ) : null}
        {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  liveBadgeOn: { backgroundColor: COLORS.secondaryLight },
  liveBadgeOff: { backgroundColor: COLORS.accentLight },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.text },
  mapWrap: {
    flex: 1,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  map: { flex: 1 },
  recenterFab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  vehicleMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.sm,
  },
  panel: {
    margin: SPACING.xl,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  panelIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelStatus: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.text },
  panelMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  shareLabel: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '600' },
  shareError: { fontSize: FONTS.sizes.sm, color: COLORS.danger },
});
