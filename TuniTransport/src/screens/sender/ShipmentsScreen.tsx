// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — ShipmentsScreen (STEP 8)
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { Card, StatusBadge, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { Shipment, ShipmentStatus } from '../../types';

type Filter = 'all' | 'pending' | 'in_transit' | 'delivered';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'delivered', label: 'Livrés' },
];

const IN_TRANSIT_GROUP: ShipmentStatus[] = ['accepted', 'collected', 'in_transit', 'arrived'];

export default function ShipmentsScreen() {
  const { user } = useAuth();
  const { shipments } = useData();
  const navigation = useAppNavigation();
  const [filter, setFilter] = useState<Filter>('all');

  const mine = shipments
    .filter((s) => s.senderId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtered = mine.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'in_transit') return IN_TRANSIT_GROUP.includes(s.status);
    return s.status === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes envois</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreateShipment')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ShipmentCard shipment={item} />}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="cube-outline"
              title="Aucun envoi"
              message="Aucun envoi ne correspond à ce filtre."
            />
          </Card>
        }
      />
    </SafeAreaView>
  );
}

function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const navigation = useAppNavigation();
  const isSmall = shipment.type === 'small';
  const bidsCount = shipment.bids?.filter((b) => b.status === 'pending').length ?? 0;

  return (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: shipment.id })}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: isSmall ? COLORS.primaryLight : COLORS.accentLight }]}>
          <Ionicons
            name={isSmall ? 'cube' : 'bicycle'}
            size={20}
            color={isSmall ? COLORS.primary : COLORS.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{isSmall ? 'Petit colis' : 'Gros objet'}</Text>
          <Text style={styles.cardDate}>
            {new Date(shipment.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <StatusBadge status={shipment.status} />
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.routeCity}>
            {shipment.pickupAddress.city}, {shipment.pickupAddress.country}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.routeCity}>
            {shipment.deliveryAddress.city}, {shipment.deliveryAddress.country}
          </Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        {shipment.price != null ? (
          <Text style={styles.price}>{shipment.price}€</Text>
        ) : (
          <View style={styles.bidsChip}>
            <Ionicons name="pricetag" size={12} color={COLORS.accent} />
            <Text style={styles.bidsChipText}>
              {bidsCount} offre{bidsCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },

  chipsWrap: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  chips: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  list: { padding: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },

  card: { marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  cardDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },

  routeBlock: { marginBottom: SPACING.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  routeConnector: {
    width: 1.5,
    height: 14,
    backgroundColor: COLORS.border,
    marginLeft: 3.5,
    marginVertical: 2,
  },
  routeCity: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '500' },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  price: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  bidsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  bidsChipText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.accent },
});
