// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — TransporterHomeScreen (STEP 9)
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { Card, SectionHeader, EmptyState, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { Route } from '../../types';

export default function TransporterHomeScreen() {
  const { user } = useAuth();
  const { shipments, routes, conversations } = useData();
  const navigation = useAppNavigation();

  const assigned = shipments.filter((s) => s.transporterId === user?.id);
  const inProgress = assigned.filter((s) =>
    ['accepted', 'collected', 'in_transit', 'arrived'].includes(s.status)
  ).length;
  const delivered = assigned.filter((s) => s.status === 'delivered').length;
  const available = shipments.filter((s) => s.status === 'pending').length;
  const hasUnread = conversations.some((c) => c.unreadCount > 0);

  const myRoutes = routes
    .filter((r) => r.transporterId === user?.id)
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
    .slice(0, 3);

  const pendingShipments = shipments
    .filter((s) => s.status === 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Bonjour,</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {user?.firstName} {user?.lastName}
              </Text>
              {user && user.rating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={COLORS.accent} />
                  <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{inProgress}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{delivered}</Text>
            <Text style={styles.statLabel}>Livrés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{available}</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
        </Card>

        {/* My upcoming routes */}
        <SectionHeader
          title="Mes prochains trajets"
          actionLabel="+ Ajouter"
          onAction={() => navigation.navigate('CreateRoute')}
        />
        {myRoutes.length === 0 ? (
          <Card style={{ marginBottom: SPACING.xl }}>
            <EmptyState
              icon="boat-outline"
              title="Aucun trajet planifié"
              message="Ajoutez votre prochain trajet en ferry pour recevoir des demandes."
            />
          </Card>
        ) : (
          myRoutes.map((r) => <RouteCard key={r.id} route={r} />)
        )}

        {/* Available requests */}
        <SectionHeader
          title="Demandes disponibles"
          actionLabel="Voir tout"
          onAction={() =>
            navigation.navigate('Main', { screen: 'Demandes' })
          }
        />
        {pendingShipments.length === 0 ? (
          <Card>
            <EmptyState
              icon="search-outline"
              title="Aucune demande"
              message="Les nouveaux envois en attente apparaîtront ici."
            />
          </Card>
        ) : (
          pendingShipments.map((s) => (
            <Card
              key={s.id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: s.id })}
            >
              <View style={styles.requestTop}>
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: s.type === 'small' ? COLORS.primaryLight : COLORS.accentLight },
                  ]}
                >
                  <Ionicons
                    name={s.type === 'small' ? 'cube' : 'bicycle'}
                    size={20}
                    color={s.type === 'small' ? COLORS.primary : COLORS.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>
                    {s.pickupAddress.city} → {s.deliveryAddress.city}
                  </Text>
                  <Text style={styles.requestSub}>
                    {s.type === 'small'
                      ? `${s.weight} kg · ${s.price}€`
                      : `Enchères · ${(s.bids ?? []).filter((b) => b.status === 'pending').length} offre(s)`}
                  </Text>
                </View>
                <StatusBadge status={s.status} />
              </View>
            </Card>
          ))
        )}

        {/* White paper */}
        <TouchableOpacity
          style={styles.whitePaperLink}
          onPress={() => navigation.navigate('WhitePaper')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Découvrir le livre blanc THL"
        >
          <Ionicons name="book-outline" size={16} color={COLORS.secondaryDark} />
          <Text style={styles.whitePaperLinkText}>
            Notre vision & feuille de route — Livre blanc THL
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.secondaryDark} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteCard({ route }: { route: Route }) {
  const date = new Date(route.departureDate);
  return (
    <Card style={styles.routeCard}>
      <View style={styles.routeTop}>
        <View style={styles.ferryIcon}>
          <Ionicons name="boat" size={20} color={COLORS.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeTitle}>{route.ferryCompany}</Text>
          <Text style={styles.routeCapacity}>{route.availableCapacity} kg disponibles</Text>
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>
            {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      <View style={styles.routePath}>
        <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.routeCity}>{route.departureCity}</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} />
        <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
        <Text style={styles.routeCity}>{route.arrivalCity}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.routeDeparture}>
          Départ{' '}
          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  name: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  ratingText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#B45309' },
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

  statsCard: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xxl },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  routeCard: { marginBottom: SPACING.md },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  ferryIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  routeCapacity: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  dateChip: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  dateChipText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.secondaryDark },

  routePath: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  routeCity: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  routeDeparture: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },

  requestCard: { marginBottom: SPACING.md },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  requestSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },

  whitePaperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.secondaryLight,
    backgroundColor: `${COLORS.secondary}08`,
    alignSelf: 'center',
  },
  whitePaperLinkText: { color: COLORS.secondaryDark, fontWeight: '600', fontSize: FONTS.sizes.sm },
});
