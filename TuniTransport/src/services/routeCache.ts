// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — cache des données géographiques statiques (AsyncStorage)
// Le tracé d'un itinéraire (arc orthodromique France → Tunisie) ne change
// jamais pour un couple de points donné : on le calcule une fois, on le
// garde en RAM pour la session et on le persiste avec un TTL de 7 jours.
// ──────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeoPoint } from '../types';

const CACHE_PREFIX = 'TT_GEO_CACHE_v1:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
  expiresAt: number;
  value: T;
}

// Mémo RAM par-dessus AsyncStorage : une seule lecture disque par clé et
// par session, même si plusieurs écrans demandent le même tracé.
const memoryCache = new Map<string, unknown>();

export async function getCachedStatic<T>(
  key: string,
  compute: () => T | Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  if (memoryCache.has(key)) return memoryCache.get(key) as T;
  const storageKey = CACHE_PREFIX + key;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (envelope.expiresAt > Date.now()) {
        memoryCache.set(key, envelope.value);
        return envelope.value;
      }
    }
  } catch {
    // cache illisible : on recalcule
  }
  const value = await compute();
  memoryCache.set(key, value);
  const envelope: CacheEnvelope<T> = { expiresAt: Date.now() + ttlMs, value };
  AsyncStorage.setItem(storageKey, JSON.stringify(envelope)).catch(() => {});
  return value;
}

// ── Géométrie sphérique ───────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Cap (bearing) initial de a vers b, en degrés [0, 360), 0 = nord.
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const phi1 = toRad(a.latitude);
  const phi2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Points intermédiaires le long de l'arc orthodromique (interpolation
// sphérique) : rend un tracé courbe réaliste au lieu d'une droite.
export function greatCirclePoints(from: GeoPoint, to: GeoPoint, segments = 48): GeoPoint[] {
  const phi1 = toRad(from.latitude);
  const lambda1 = toRad(from.longitude);
  const phi2 = toRad(to.latitude);
  const lambda2 = toRad(to.longitude);

  const d =
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin((phi2 - phi1) / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin((lambda2 - lambda1) / 2) ** 2
        )
      )
    );
  if (d < 1e-9) return [from, to];

  const points: GeoPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    points.push({
      latitude: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
      longitude: toDeg(Math.atan2(y, x)),
    });
  }
  return points;
}

// Position et cap à une fraction [0, 1] de la distance cumulée du tracé
// (utilisé par la simulation du mode démo).
export function pointAlongPath(
  path: GeoPoint[],
  fraction: number
): { point: GeoPoint; heading: number } {
  if (path.length === 0) return { point: { latitude: 0, longitude: 0 }, heading: 0 };
  if (path.length === 1) return { point: path[0], heading: 0 };

  const clamped = Math.min(1, Math.max(0, fraction));
  const legs = path.slice(1).map((p, i) => haversineKm(path[i], p));
  const total = legs.reduce((sum, l) => sum + l, 0);
  if (total === 0) return { point: path[0], heading: 0 };

  let remaining = clamped * total;
  for (let i = 0; i < legs.length; i++) {
    if (remaining <= legs[i] || i === legs.length - 1) {
      const t = legs[i] === 0 ? 0 : Math.min(1, remaining / legs[i]);
      const a = path[i];
      const b = path[i + 1];
      return {
        point: {
          latitude: a.latitude + (b.latitude - a.latitude) * t,
          longitude: a.longitude + (b.longitude - a.longitude) * t,
        },
        heading: bearingDeg(a, b),
      };
    }
    remaining -= legs[i];
  }
  return { point: path[path.length - 1], heading: 0 };
}

// Tracé (statique) entre deux points, mis en cache AsyncStorage + RAM.
export async function getRoutePath(from: GeoPoint, to: GeoPoint): Promise<GeoPoint[]> {
  const key =
    `path:${from.latitude.toFixed(3)},${from.longitude.toFixed(3)}` +
    `->${to.latitude.toFixed(3)},${to.longitude.toFixed(3)}`;
  return getCachedStatic(key, () => greatCirclePoints(from, to));
}
