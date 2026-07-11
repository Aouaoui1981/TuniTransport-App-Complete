// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — SenderHomeScreen (STEP 8)
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { Card, SectionHeader, StatusBadge, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { Shipment } from '../../types';
import { PRICE_PER_KG } from '../../utils/pricing';

export default function SenderHomeScreen() {
  const { user } = useAuth();
  const { shipments, conversations } = useData();
  const navigation = useAppNavigation();

  const mine = shipments.filter((s) => s.senderId === user?.id);
  const inProgress = mine.filter((s) =>
    ['accepted', 'collected', 'in_transit', 'arrived'].includes(s.status)
  ).length;
  const delivered = mine.filter((s) => s.status === 'delivered').length;
  const auctions = mine.filter((s) => s.type === 'large' && s.status === 'pending').length;
  const hasUnread = conversations.some((c) => c.unreadCount > 0);
  const recent = [...mine]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Bonjour,</Text>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: COLORS.primaryLight }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateShipment', { type: 'small' })}
          >
            <Ionicons name="cube" size={26} color={COLORS.primary} />
            <Text style={[styles.quickTitle, { color: COLORS.primaryDark }]}>Petit colis</Text>
            <Text style={styles.quickSub}>{PRICE_PER_KG}€/kg</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: COLORS.accentLight }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateShipment', { type: 'large' })}
          >
            <Ionicons name="bicycle" size={26} color={COLORS.accent} />
            <Text style={[styles.quickTitle, { color: '#B45309' }]}>Gros objet</Text>
            <Text style={styles.quickSub}>Prix négociable</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: COLORS.secondaryLight }]}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('Main', { screen: 'Carte' })
            }
          >
            <Ionicons name="map" size={26} color={COLORS.secondaryDark} />
            <Text style={[styles.quickTitle, { color: COLORS.secondaryDark }]}>Carte</Text>
            <Text style={styles.quickSub}>Itinéraires</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{inProgress}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{delivered}</Text>
            <Text style={styles.statLabel}>Livrés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{auctions}</Text>
            <Text style={styles.statLabel}>Enchères</Text>
          </View>
        </Card>

        {/* Recent shipments */}
        <SectionHeader
          title="Mes envois récents"
          actionLabel="Voir tout"
          onAction={() =>
            navigation.navigate('Main', { screen: 'Envois' })
          }
        />

        {recent.length === 0 ? (
          <Card>
            <EmptyState
              icon="cube-outline"
              title="Aucun envoi"
              message="Créez votre premier envoi pour commencer."
            />
          </Card>
        ) : (
          recent.map((s) => <ShipmentMiniCard key={s.id} shipment={s} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ShipmentMiniCard({ shipment }: { shipment: Shipment }) {
  const navigation = useAppNavigation();
  const isSmall = shipment.type === 'small';
  const bidsCount = shipment.bids?.filter((b) => b.status === 'pending').length ?? 0;

  return (
    <Card
      style={styles.miniCard}
      onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: shipment.id })}
    >
      <View style={styles.miniTop}>
        <View style={[styles.typeIcon, { backgroundColor: isSmall ? COLORS.primaryLight : COLORS.accentLight }]}>
          <Ionicons
            name={isSmall ? 'cube' : 'bicycle'}
            size={20}
            color={isSmall ? COLORS.primary : COLORS.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniTitle}>
            {isSmall ? 'Petit colis' : shipment.description?.split(' ').slice(0, 3).join(' ') ?? 'Gros objet'}
          </Text>
          <Text style={styles.miniDate}>
            {new Date(shipment.createdAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <StatusBadge status={shipment.status} />
      </View>

      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.routeCity}>{shipment.pickupAddress.city}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
        <Text style={styles.routeCity}>{shipment.deliveryAddress.city}</Text>
      </View>

      <View style={styles.miniBottom}>
        {shipment.price != null ? (
          <Text style={styles.price}>{shipment.price}€</Text>
        ) : (
          <Text style={[styles.price, { color: COLORS.accent }]}>
            {bidsCount} offre{bidsCount > 1 ? 's' : ''} reçue{bidsCount > 1 ? 's' : ''}
          </Text>
        )}
        {shipment.weight != null && <Text style={styles.weight}>{shipment.weight} kg</Text>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  hello: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '500' },
  name: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
  },

  quickRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  quickCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  quickTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  quickSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  miniCard: { marginBottom: SPACING.md },
  miniTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  miniDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  routeCity: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  routeLine: { flex: 1, height: 1.5, backgroundColor: COLORS.border, borderRadius: 1 },

  miniBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  weight: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});
