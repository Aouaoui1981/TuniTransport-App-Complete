// ──────────────────────────────────────────────────────────────────────────
// THL — Carte interactive (fallback natif).
// La carte Leaflet interactive est rendue sur le web (RouteMap.web.tsx). Sur
// mobile natif, on affiche un récapitulatif clair de l'itinéraire.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK, SPACING, RADIUS, FONTS } from '../utils/theme';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; city: string; note: string; color: string }[] = [
  { icon: 'location', city: 'Paris — France', note: 'Point de départ', color: DARK.colors.secondary },
  { icon: 'car-outline', city: 'Marseille', note: 'Trajet terrestre jusqu’au port', color: DARK.colors.secondary },
  { icon: 'boat-outline', city: 'Traversée en ferry', note: 'Marseille → Tunis (Méditerranée)', color: DARK.colors.accent },
  { icon: 'flag', city: 'Tunis — Tunisie', note: 'Arrivée', color: DARK.colors.accent },
];

export default function RouteMap() {
  return (
    <View style={styles.wrap}>
      {STEPS.map((s, i) => (
        <View key={s.city} style={styles.row}>
          <View style={styles.railCol}>
            <View style={[styles.dot, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={14} color={DARK.colors.bgBase} />
            </View>
            {i < STEPS.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.textCol}>
            <Text style={styles.city}>{s.city}</Text>
            <Text style={styles.note}>{s.note}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: SPACING.xl },
  row: { flexDirection: 'row', gap: SPACING.md },
  railCol: { width: 30, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: DARK.colors.borderStrong, marginVertical: 2, minHeight: 26 },
  textCol: { flex: 1, paddingBottom: SPACING.xl },
  city: { fontSize: FONTS.sizes.md, fontWeight: '700', color: DARK.colors.text },
  note: { fontSize: FONTS.sizes.sm, color: DARK.colors.textSecondary, marginTop: 2 },
});
