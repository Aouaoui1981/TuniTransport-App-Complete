// ──────────────────────────────────────────────────────────────────────────
// THL — Itinéraire France → Tunisie
// Carte interactive du trajet (Paris → Marseille en terrestre, puis traversée
// en ferry jusqu'à Tunis), avec une légende.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DARK, SPACING, RADIUS, FONTS } from '../../utils/theme';
import RouteMap from '../../components/RouteMap';

export default function RouteMapScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Itinéraire France → Tunisie</Text>
        <Text style={styles.subtitle}>
          Vos colis voyagent par la route jusqu'au port, puis en ferry à travers la Méditerranée.
        </Text>
      </View>

      <View style={styles.mapCard}>
        <RouteMap />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: DARK.colors.secondary }]} />
          <Text style={styles.legendText}>Trajet terrestre</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatchDashed, { borderColor: DARK.colors.accent }]} />
          <Text style={styles.legendText}>Traversée en ferry</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="boat-outline" size={16} color={DARK.colors.accent} />
          <Text style={styles.legendText}>Trans-Méditerranée</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK.colors.bgBase },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: DARK.colors.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: DARK.colors.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },

  mapCard: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK.colors.border,
    backgroundColor: DARK.colors.bgBase,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  swatch: { width: 20, height: 4, borderRadius: 2 },
  swatchDashed: { width: 20, height: 0, borderTopWidth: 3, borderStyle: 'dashed' },
  legendText: { fontSize: FONTS.sizes.sm, color: DARK.colors.textSecondary, fontWeight: '600' },
});
