// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Détails de l'envoi — STEP 10, card order per spec:
// Status → Route → Items/Description → Bids → Tracking → Transporter → Actions
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, StatusBadge, RatingStars, SectionHeader, Avatar } from '../../components';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { Bid } from '../../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShipmentDetailScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ShipmentDetail'>>();
  const { user } = useAuth();
  const { getShipmentById, conversations } = useData();

  const shipment = getShipmentById(route.params.shipmentId);

  const isSender = user?.role === 'sender';
  const isTransporter = user?.role === 'transporter';

  const sortedBids = useMemo(() => {
    if (!shipment?.bids) return [] as Bid[];
    return [...shipment.bids].sort((a, b) => a.price - b.price);
  }, [shipment?.bids]);

  const lastEvents = useMemo(() => {
    if (!shipment) return [];
    return [...shipment.trackingHistory]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 3);
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

  const isLarge = shipment.type === 'large';
  const shortId = shipment.id.slice(-4).toUpperCase();

  const openChatWithTransporter = () => {
    const conv = conversations.find(
      (c) =>
        (c.shipmentId && c.shipmentId === shipment.id) ||
        (shipment.transporterId &&
          c.participants.includes(shipment.transporterId) &&
          c.participants.includes(shipment.senderId))
    );
    if (conv) {
      navigation.navigate('Chat', { conversationId: conv.id });
    } else {
      Alert.alert('Messagerie', 'Aucune conversation disponible pour cet envoi.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 1 — Status */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <StatusBadge status={shipment.status} />
            <Text style={styles.shipmentId}>#{shortId}</Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.typeIcon,
                { backgroundColor: isLarge ? COLORS.accentLight : COLORS.primaryLight },
              ]}
            >
              <Ionicons
                name={isLarge ? 'cube' : 'cube-outline'}
                size={22}
                color={isLarge ? COLORS.accent : COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeTitle}>{isLarge ? 'Gros objet' : 'Petit colis'}</Text>
              <Text style={styles.typeSub}>
                Créé le{' '}
                {new Date(shipment.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            {shipment.price != null ? (
              <Text style={styles.price}>{shipment.price}€</Text>
            ) : (
              <Text style={styles.priceMuted}>Enchères</Text>
            )}
          </View>
        </Card>

        {/* 2 — Route */}
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>Itinéraire</Text>
          <View style={styles.addressBlock}>
            <View style={styles.addressRow}>
              <View style={[styles.bigDot, { backgroundColor: COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Collecte</Text>
                <Text style={styles.addressCity}>
                  {shipment.pickupAddress.city}, {shipment.pickupAddress.country}
                </Text>
                <Text style={styles.addressDetail}>{shipment.pickupAddress.street}</Text>
                <Text style={styles.addressContact}>
                  {shipment.pickupAddress.contactName} · {shipment.pickupAddress.contactPhone}
                </Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.addressRow}>
              <View style={[styles.bigDot, { backgroundColor: COLORS.secondary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Livraison</Text>
                <Text style={styles.addressCity}>
                  {shipment.deliveryAddress.city}, {shipment.deliveryAddress.country}
                </Text>
                <Text style={styles.addressDetail}>{shipment.deliveryAddress.street}</Text>
                <Text style={styles.addressContact}>
                  {shipment.deliveryAddress.contactName} · {shipment.deliveryAddress.contactPhone}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* 3 — Items (small) or Description (large) */}
        {isLarge ? (
          <Card style={styles.card}>
            <Text style={styles.cardHeading}>Description</Text>
            <Text style={styles.description}>{shipment.description}</Text>
            {shipment.dimensions ? (
              <View style={styles.dimensionsRow}>
                <Ionicons name="resize-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.dimensions}>{shipment.dimensions}</Text>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardHeading}>Contenu</Text>
            {(shipment.items ?? []).map((item, idx) => (
              <View key={`${item.name}-${idx}`} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  ×{item.quantity} · {item.weight} kg
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {shipment.weight ?? 0} kg = {shipment.price ?? 0}€
              </Text>
            </View>
          </Card>
        )}

        {/* 4 — Bids (large only) */}
        {isLarge && sortedBids.length > 0 ? (
          <Card style={styles.card}>
            <SectionHeader
              title={`Offres reçues (${sortedBids.length})`}
              actionLabel={isSender && sortedBids.length > 2 ? 'Voir tout' : undefined}
              onAction={() => navigation.navigate('BidList', { shipmentId: shipment.id })}
            />
            {sortedBids.slice(0, 2).map((bid) => (
              <View key={bid.id} style={styles.bidRow}>
                <Avatar name={bid.transporterName} size={38} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bidName}>{bid.transporterName}</Text>
                  <RatingStars rating={bid.transporterRating} size={12} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bidPrice}>{bid.price}€</Text>
                  {bid.status !== 'pending' ? (
                    <Text
                      style={[
                        styles.bidStatus,
                        { color: bid.status === 'accepted' ? COLORS.success : COLORS.danger },
                      ]}
                    >
                      {bid.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            {isSender && shipment.status === 'pending' ? (
              <TouchableOpacity
                style={styles.bidCta}
                onPress={() => navigation.navigate('BidList', { shipmentId: shipment.id })}
              >
                <Ionicons name="hammer" size={16} color={COLORS.white} />
                <Text style={styles.bidCtaText}>Gérer les offres</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}

        {/* 5 — Tracking */}
        <Card style={styles.card}>
          <SectionHeader
            title="Suivi"
            actionLabel="Détails"
            onAction={() => navigation.navigate('Tracking', { shipmentId: shipment.id })}
          />
          {lastEvents.map((ev, idx) => (
            <View key={ev.id} style={styles.trackRow}>
              <View
                style={[
                  styles.trackDot,
                  { backgroundColor: idx === 0 ? COLORS.primary : COLORS.border },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trackDesc, idx === 0 && { color: COLORS.text, fontWeight: '700' }]}>
                  {ev.description}
                </Text>
                <Text style={styles.trackMeta}>
                  {ev.location ? `${ev.location} · ` : ''}
                  {formatDateTime(ev.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* 6 — Transporter (if assigned) */}
        {shipment.transporterId && shipment.transporterName ? (
          <Card style={styles.card}>
            <Text style={styles.cardHeading}>Transporteur</Text>
            <View style={styles.transporterRow}>
              <Avatar name={shipment.transporterName} size={46} color={COLORS.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.transporterName}>{shipment.transporterName}</Text>
                <RatingStars
                  rating={
                    sortedBids.find((b) => b.id === shipment.selectedBidId)?.transporterRating ?? 5
                  }
                  size={13}
                />
              </View>
              <TouchableOpacity style={styles.chatBtn} onPress={openChatWithTransporter}>
                <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : null}

        {/* 7 — Actions */}
        <View style={styles.actions}>
          {isSender && shipment.status === 'accepted' && shipment.price != null ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              onPress={() =>
                navigation.navigate('Payment', {
                  shipmentId: shipment.id,
                  amount: shipment.price ?? 0,
                })
              }
            >
              <Ionicons name="card" size={18} color={COLORS.white} />
              <Text style={styles.actionText}>Payer {shipment.price}€</Text>
            </TouchableOpacity>
          ) : null}

          {isSender && shipment.status === 'delivered' ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
              onPress={() => navigation.navigate('RateUser', { shipmentId: shipment.id })}
            >
              <Ionicons name="star" size={18} color={COLORS.white} />
              <Text style={styles.actionText}>Évaluer le transporteur</Text>
            </TouchableOpacity>
          ) : null}

          {isTransporter && shipment.status === 'pending' && isLarge ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.secondary }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="hammer" size={18} color={COLORS.white} />
              <Text style={styles.actionText}>Faire une offre</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  card: { gap: SPACING.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shipmentId: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textLight },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  typeSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.primary },
  priceMuted: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.accent },
  cardHeading: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  addressBlock: { gap: 0 },
  addressRow: { flexDirection: 'row', gap: SPACING.md },
  bigDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  addressLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addressCity: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  addressDetail: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 2 },
  addressContact: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: 2 },
  routeLine: {
    width: 2,
    height: 22,
    backgroundColor: COLORS.border,
    marginLeft: 5,
    marginVertical: SPACING.xs,
  },
  description: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 21 },
  dimensionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dimensions: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '600' },
  itemMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  totalLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  totalValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  bidName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  bidPrice: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text },
  bidStatus: { fontSize: FONTS.sizes.xs, fontWeight: '700', marginTop: 2 },
  bidCta: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  bidCtaText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  trackRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  trackDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  trackDesc: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  trackMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: 2 },
  transporterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  transporterName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: SPACING.sm, marginTop: SPACING.xs },
  actionBtn: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
