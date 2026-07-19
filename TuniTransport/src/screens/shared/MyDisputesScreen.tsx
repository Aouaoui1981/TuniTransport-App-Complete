// ──────────────────────────────────────────────────────────────────────────
// THL — Mes signalements (suivi des litiges par l'utilisateur)
// ──────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card, EmptyState } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { listMyDisputes } from '../../services/api';
import { Dispute, DisputeStatus } from '../../types';
import { DISPUTE_CATEGORY_LABEL, DISPUTE_STATUS_LABEL } from '../../content/disputes';

const STATUS_COLOR: Record<DisputeStatus, string> = {
  open: COLORS.accent,
  in_review: COLORS.primary,
  resolved: COLORS.success,
  rejected: COLORS.danger,
};

function StatusPill({ status }: { status: DisputeStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{DISPUTE_STATUS_LABEL[status]}</Text>
    </View>
  );
}

export default function MyDisputesScreen() {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listMyDisputes());
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger vos signalements.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Aucun signalement"
            message="Vous n'avez signalé aucun problème. En cas de souci sur un envoi, ouvrez-le puis « Signaler un problème »."
          />
        ) : (
          items.map((d) => {
            const date = new Date(d.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            return (
              <Card key={d.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.category}>{DISPUTE_CATEGORY_LABEL[d.category]}</Text>
                  <StatusPill status={d.status} />
                </View>
                <Text style={styles.date}>Envoyé le {date}</Text>
                {d.description ? <Text style={styles.desc}>{d.description}</Text> : null}
                {d.adminNote ? (
                  <View style={styles.reply}>
                    <View style={styles.replyHead}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.replyLabel}>Réponse de l'équipe</Text>
                    </View>
                    <Text style={styles.replyText}>{d.adminNote}</Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: { marginBottom: SPACING.md, gap: SPACING.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  category: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },
  desc: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 20, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  reply: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  replyLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  replyText: { fontSize: FONTS.sizes.sm, color: COLORS.text, lineHeight: 19 },
});
