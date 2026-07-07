// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Offres reçues — STEP 10 + STEP 11 auction rule
// Sorted ascending by price; cheapest gets a "Meilleur prix" trophy.
// Accepting a bid assigns the transporter and opens the payment path.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, RatingStars, Avatar, EmptyState } from '../../components';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { Bid } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function BidListScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'BidList'>>();
  const { user } = useAuth();
  const { getShipmentById, acceptBid, ensureConversation } = useData();
  const [accepting, setAccepting] = useState<string | null>(null);

  const shipment = getShipmentById(route.params.shipmentId);
  const isSender = user?.role === 'sender' && user?.id === shipment?.senderId;

  const bids = useMemo(() => {
    if (!shipment?.bids) return [] as Bid[];
    return [...shipment.bids].sort((a, b) => a.price - b.price);
  }, [shipment?.bids]);

  const cheapestId = bids.find((b) => b.status !== 'rejected')?.id;

  if (!shipment) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Envoi introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onAccept = (bid: Bid) => {
    Alert.alert(
      'Accepter cette offre',
      `${bid.transporterName} transportera votre envoi pour ${bid.price}€.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            setAccepting(bid.id);
            try {
              await acceptBid(shipment.id, bid.id);
              Alert.alert(
                'Offre acceptée',
                `${bid.transporterName} a été assigné à votre envoi.`,
                [
                  {
                    text: 'Payer maintenant',
                    onPress: () =>
                      navigation.navigate('Payment', {
                        shipmentId: shipment.id,
                        amount: bid.price,
                      }),
                  },
                  { text: 'Plus tard', style: 'cancel', onPress: () => navigation.goBack() },
                ]
              );
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? 'Impossible d’accepter l’offre.');
            } finally {
              setAccepting(null);
            }
          },
        },
      ]
    );
  };

  const openChat = async (bid: Bid) => {
    try {
      const conv = await ensureConversation({
        otherUserId: bid.transporterId,
        otherUserName: bid.transporterName,
        shipmentId: shipment.id,
      });
      navigation.navigate('Chat', { conversationId: conv.id });
    } catch (e: any) {
      Alert.alert('Messagerie', e?.message ?? "Impossible d'ouvrir la conversation.");
    }
  };

  const renderBid = ({ item }: { item: Bid }) => {
    const isBest = item.id === cheapestId;
    const rejected = item.status === 'rejected';
    const accepted = item.status === 'accepted';
    return (
      <Card style={[styles.card, rejected && { opacity: 0.55 }]}>
        {isBest && !rejected ? (
          <View style={styles.bestBadge}>
            <Ionicons name="trophy" size={12} color={COLORS.accent} />
            <Text style={styles.bestBadgeText}>Meilleur prix</Text>
          </View>
        ) : null}

        <View style={styles.bidHeader}>
          <Avatar name={item.transporterName} size={44} color={COLORS.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bidName}>{item.transporterName}</Text>
            <View style={styles.ratingRow}>
              <RatingStars rating={item.transporterRating} size={12} />
              <Text style={styles.ratingValue}>{item.transporterRating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.bidPrice}>{item.price}€</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>Livraison est. {formatDate(item.estimatedDelivery)}</Text>
          </View>
          <Text style={styles.metaText}>Offre du {formatDate(item.createdAt)}</Text>
        </View>

        {item.message ? <Text style={styles.message}>« {item.message} »</Text> : null}

        {accepted ? (
          <View style={styles.acceptedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.acceptedText}>Offre acceptée</Text>
          </View>
        ) : null}

        {isSender && shipment.status === 'pending' && item.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.msgBtn} onPress={() => openChat(item)}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, accepting === item.id && { opacity: 0.6 }]}
              onPress={() => onAccept(item)}
              disabled={accepting !== null}
            >
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
              <Text style={styles.acceptBtnText}>
                {accepting === item.id ? 'Validation…' : 'Accepter'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {bids.length} offre{bids.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.routeText}>{shipment.pickupAddress.city}</Text>
          <Ionicons
            name="arrow-forward"
            size={13}
            color={COLORS.textLight}
            style={{ marginHorizontal: SPACING.xs }}
          />
          <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.routeText}>{shipment.deliveryAddress.city}</Text>
        </View>
      </View>
      <FlatList
        data={bids}
        keyExtractor={(b) => b.id}
        renderItem={renderBid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="hammer-outline"
            title="Aucune offre"
            message="Les transporteurs n'ont pas encore fait d'offre pour cet envoi."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, gap: SPACING.xs },
  count: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: SPACING.xs },
  routeText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  list: { padding: SPACING.xl, gap: SPACING.md, flexGrow: 1 },
  card: { gap: SPACING.sm },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  bestBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.accent },
  bidHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  bidName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingValue: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  bidPrice: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.primary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  message: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontStyle: 'italic',
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  acceptedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  acceptedText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.success },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  msgBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.md },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
});
