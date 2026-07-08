// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Notifications
// Feed derived from live app data: shipment tracking events, bids received
// and unread conversations. Each entry navigates to the related screen.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { EmptyState, statusLabel } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation } from '../../navigation/AppNavigator';

type NotificationItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  body: string;
  timestamp: string;
  onPress: () => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'À l’instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { shipments, conversations } = useData();

  const items = useMemo<NotificationItem[]>(() => {
    if (!user) return [];
    const list: NotificationItem[] = [];

    const mine = shipments.filter(
      (s) => s.senderId === user.id || s.transporterId === user.id
    );

    // Shipment status updates (tracking history)
    for (const s of mine) {
      const route = `${s.pickupAddress.city} → ${s.deliveryAddress.city}`;
      for (const ev of s.trackingHistory) {
        list.push({
          id: `te-${s.id}-${ev.id}`,
          icon: 'cube-outline',
          color: COLORS.primary,
          bg: COLORS.primaryLight,
          title: statusLabel(ev.status),
          body: `${route} · ${ev.description}`,
          timestamp: ev.timestamp,
          onPress: () => navigation.navigate('ShipmentDetail', { shipmentId: s.id }),
        });
      }
    }

    // Bids received on my auctions (sender only)
    if (user.role === 'sender') {
      for (const s of mine.filter((x) => x.senderId === user.id)) {
        for (const bid of s.bids ?? []) {
          if (bid.status !== 'pending') continue;
          list.push({
            id: `bid-${bid.id}`,
            icon: 'hammer-outline',
            color: COLORS.accent,
            bg: COLORS.accentLight,
            title: 'Nouvelle offre reçue',
            body: `${bid.transporterName} propose ${bid.price}€`,
            timestamp: bid.createdAt,
            onPress: () => navigation.navigate('BidList', { shipmentId: s.id }),
          });
        }
      }
    }

    // Unread messages
    for (const c of conversations) {
      if (c.unreadCount <= 0) continue;
      const otherId = c.participants.find((p) => p !== user.id);
      const otherName = (otherId && c.participantNames[otherId]) || 'Contact';
      list.push({
        id: `msg-${c.id}`,
        icon: 'chatbubble-outline',
        color: COLORS.secondary,
        bg: COLORS.secondaryLight,
        title: `Message de ${otherName}`,
        body: c.lastMessage?.text ?? `${c.unreadCount} message(s) non lu(s)`,
        timestamp: c.lastMessage?.timestamp ?? c.updatedAt,
        onPress: () => navigation.navigate('Chat', { conversationId: c.id }),
      });
    }

    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [user, shipments, conversations, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={item.onPress}>
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.when}>{formatWhen(item.timestamp)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Aucune notification"
            message="Les mises à jour de vos envois, offres et messages apparaîtront ici."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.xl, gap: SPACING.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  body: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  when: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 4 },
});
