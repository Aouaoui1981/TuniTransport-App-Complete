// ──────────────────────────────────────────────────────────────────────────
// THL — MyDeliveriesScreen (transporteur)
// Liste des envois pris en charge par le transporteur : en cours ET livrés.
// Comble l'absence d'un écran pour consulter les livraisons terminées.
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, StatusBadge, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation, MainTabParamList } from '../../navigation/AppNavigator';
import { Shipment, ShipmentStatus } from '../../types';

type Filter = 'all' | 'in_progress' | 'delivered';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'delivered', label: 'Livrées' },
];

const IN_PROGRESS_GROUP: ShipmentStatus[] = ['accepted', 'collected', 'in_transit', 'arrived'];

export default function MyDeliveriesScreen() {
  const { user } = useAuth();
  const { shipments } = useData();
  const route = useRoute<RouteProp<MainTabParamList, 'Livraisons'>>();
  const [filter, setFilter] = useState<Filter>(route.params?.filter ?? 'all');

  const mine = shipments
    .filter((s) => s.transporterId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const earnings = mine
    .filter((s) => s.status === 'delivered')
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const filtered = mine.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return IN_PROGRESS_GROUP.includes(s.status);
    return s.status === 'delivered';
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mes livraisons</Text>
          <Text style={styles.subtitle}>Total encaissé : {earnings}€</Text>
        </View>
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
        renderItem={({ item }) => <DeliveryCard shipment={item} />}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="cube-outline"
              title="Aucune livraison"
              message={
                filter === 'delivered'
                  ? "Vos livraisons terminées apparaîtront ici."
                  : "Les envois que vous prenez en charge apparaîtront ici."
              }
            />
          </Card>
        }
      />
    </SafeAreaView>
  );
}

function DeliveryCard({ shipment }: { shipment: Shipment }) {
  const navigation = useAppNavigation();
  const isSmall = shipment.type === 'small';

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
          <Text style={styles.cardTitle}>
            {shipment.pickupAddress.city} → {shipment.deliveryAddress.city}
          </Text>
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

      <View style={styles.cardBottom}>
        <Text style={styles.meta}>
          {shipment.weight ? `${shipment.weight} kg` : 'Gros objet'}
        </Text>
        {shipment.price != null ? <Text style={styles.price}>{shipment.price}€</Text> : null}
        <View style={{ flex: 1 }} />
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
  subtitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.secondaryDark, marginTop: 2 },

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
  chipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
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

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  meta: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  price: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.secondary },
});
