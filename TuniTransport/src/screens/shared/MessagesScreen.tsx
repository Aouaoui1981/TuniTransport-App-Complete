// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Messages — STEP 10
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Avatar, EmptyState } from '../../components';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { Conversation } from '../../types';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MessagesScreen() {
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { conversations } = useData();

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations]
  );

  const otherName = (c: Conversation): string => {
    const otherId = c.participants.find((p) => p !== user?.id);
    return (otherId && c.participantNames[otherId]) || 'Contact';
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const name = otherName(item);
    const hasUnread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
      >
        <Avatar
          name={name}
          size={50}
          color={user?.role === 'sender' ? COLORS.secondary : COLORS.primary}
        />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, hasUnread && { fontWeight: '800' }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, hasUnread && { color: COLORS.primary, fontWeight: '700' }]}>
              {item.lastMessage ? formatTime(item.lastMessage.timestamp) : ''}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.preview, hasUnread && { color: COLORS.text, fontWeight: '600' }]}
              numberOfLines={1}
            >
              {item.lastMessage?.text ?? 'Démarrez la conversation'}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Aucune conversation"
            message="Vos conversations avec les transporteurs et expéditeurs apparaîtront ici."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  list: { flexGrow: 1, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  time: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginLeft: SPACING.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  unreadText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '800' },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 86 },
});
