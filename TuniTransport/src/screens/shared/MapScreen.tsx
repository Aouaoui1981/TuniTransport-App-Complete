// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Carte des itinéraires
// Markers: départ (bleu, France) → arrivée (vert, Tunisie), dashed polylines.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useData } from '../../context/DataContext';
import { coordsFor } from '../../services/mockData';
import { Route } from '../../types';

// Mediterranean framing: south of France down to the Tunisian coast.
const INITIAL_REGION = {
  latitude: 40.5,
  longitude: 7.5,
  latitudeDelta: 14,
  longitudeDelta: 14,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MapScreen() {
  const { routes } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const drawable = useMemo(
    () =>
      routes
        .map((r) => ({
          route: r,
          from: coordsFor(r.departureCity),
          to: coordsFor(r.arrivalCity),
        }))
        .filter((d) => d.from && d.to) as {
        route: Route;
        from: { latitude: number; longitude: number };
        to: { latitude: number; longitude: number };
      }[],
    [routes]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Carte des itinéraires</Text>
        <Text style={styles.subtitle}>
          {routes.length} trajet{routes.length > 1 ? 's' : ''} France → Tunisie
        </Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView style={styles.map} initialRegion={INITIAL_REGION}>
          {drawable.map(({ route, from, to }) => {
            const active = selectedId === null || selectedId === route.id;
            return (
              <React.Fragment key={route.id}>
                <Marker
                  coordinate={from}
                  title={route.departureCity}
                  description={`Départ · ${route.ferryCompany}`}
                  pinColor={COLORS.primary}
                />
                <Marker
                  coordinate={to}
                  title={route.arrivalCity}
                  description={`Arrivée · ${formatDate(route.estimatedArrivalDate)}`}
                  pinColor={COLORS.secondary}
                />
                <Polyline
                  coordinates={[from, to]}
                  strokeColor={active ? COLORS.primary : COLORS.border}
                  strokeWidth={active ? 2.5 : 1.5}
                  lineDashPattern={[8, 6]}
                />
              </React.Fragment>
            );
          })}
        </MapView>
      </View>

      {/* Route cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {routes.map((r) => {
          const active = selectedId === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.routeCard, active && styles.routeCardActive]}
              activeOpacity={0.8}
              onPress={() => setSelectedId(active ? null : r.id)}
            >
              <View style={styles.routeTop}>
                <Ionicons name="boat" size={15} color={COLORS.primary} />
                <Text style={styles.company}>{r.ferryCompany}</Text>
              </View>
              <Text style={styles.routeCities}>
                {r.departureCity} → {r.arrivalCity}
              </Text>
              <View style={styles.routeMeta}>
                <Text style={styles.metaText}>Départ {formatDate(r.departureDate)}</Text>
                <View style={styles.capacityChip}>
                  <Text style={styles.capacityText}>{r.availableCapacity} kg dispo</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 2 },
  mapWrap: {
    flex: 1,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  map: { flex: 1 },
  cards: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  routeCard: {
    width: 220,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  routeCardActive: { borderColor: COLORS.primary, borderWidth: 1.5 },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  company: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.primary },
  routeCities: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  routeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  capacityChip: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  capacityText: { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.secondaryDark },
});
