// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Suivi de l'envoi — STEP 10
// Vertical timeline, newest first, per-status icons, latest highlighted.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, statusLabel } from '../../components';
import { useData } from '../../context/DataContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ShipmentStatus } from '../../types';

const STATUS_ICONS: Record<ShipmentStatus, keyof typeof Ionicons.glyphMap> = {
  pending: 'time',
  accepted: 'checkmark-circle',
  collected: 'cube',
  in_transit: 'boat',
  arrived: 'flag',
  delivered: 'checkmark-done-circle',
  cancelled: 'close-circle',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrackingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Tracking'>>();
  const { getShipmentById } = useData();
  const shipment = getShipmentById(route.params.shipmentId);

  const events = useMemo(() => {
    if (!shipment) return [];
    return [...shipment.trackingHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [shipment]);

  if (!shipment) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Envoi introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary */}
        <Card style={styles.summary}>
          <View style={styles.summaryRoute}>
            <View style={styles.summaryCity}>
              <Text style={styles.summaryCityName}>{shipment.pickupAddress.city}</Text>
              <Text style={styles.summaryCountry}>{shipment.pickupAddress.country}</Text>
            </View>
            <View style={styles.summaryBoat}>
              <View style={styles.dashedLine} />
              <View style={styles.boatCircle}>
                <Ionicons name="boat" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.dashedLine} />
            </View>
            <View style={[styles.summaryCity, { alignItems: 'flex-end' }]}>
              <Text style={styles.summaryCityName}>{shipment.deliveryAddress.city}</Text>
              <Text style={styles.summaryCountry}>{shipment.deliveryAddress.country}</Text>
            </View>
          </View>
          {shipment.transporterName ? (
            <View style={styles.summaryTransporter}>
              <Ionicons name="person-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.summaryTransporterText}>
                Transporteur : {shipment.transporterName}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Timeline */}
        <Card style={styles.timelineCard}>
          {events.map((ev, idx) => {
            const isLatest = idx === 0;
            const isLast = idx === events.length - 1;
            return (
              <View key={ev.id} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIcon,
                      isLatest
                        ? { backgroundColor: COLORS.primary }
                        : { backgroundColor: COLORS.borderLight },
                    ]}
                  >
                    <Ionicons
                      name={STATUS_ICONS[ev.status]}
                      size={16}
                      color={isLatest ? COLORS.white : COLORS.textSecondary}
                    />
                  </View>
                  {!isLast ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={[styles.timelineBody, isLatest && styles.timelineBodyLatest]}>
                  <View style={styles.timelineTitleRow}>
                    <Text style={[styles.timelineStatus, isLatest && { color: COLORS.primary }]}>
                      {statusLabel(ev.status)}
                    </Text>
                    {isLatest ? (
                      <View style={styles.latestChip}>
                        <Text style={styles.latestChipText}>Dernier</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.timelineDesc}>{ev.description}</Text>
                  <Text style={styles.timelineMeta}>
                    {ev.location ? `${ev.location} · ` : ''}
                    {formatDateTime(ev.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  summary: { gap: SPACING.md },
  summaryRoute: { flexDirection: 'row', alignItems: 'center' },
  summaryCity: { flex: 1 },
  summaryCityName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  summaryCountry: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  summaryBoat: { flex: 1.2, flexDirection: 'row', alignItems: 'center' },
  dashedLine: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  boatCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xs,
  },
  summaryTransporter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  summaryTransporterText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  timelineCard: { paddingVertical: SPACING.lg },
  timelineRow: { flexDirection: 'row', gap: SPACING.md },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.borderLight, marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: SPACING.lg },
  timelineBodyLatest: {},
  timelineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  timelineStatus: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.text },
  latestChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  latestChipText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  timelineDesc: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 2 },
  timelineMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: 2 },
});
