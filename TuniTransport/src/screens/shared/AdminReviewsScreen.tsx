// ──────────────────────────────────────────────────────────────────────────
// THL — Modération des avis (écran administrateur)
// Liste tous les avis et permet d'en supprimer un (contenu abusif).
// Autorisation appliquée côté serveur (RPC is_admin).
// ──────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { Card, EmptyState, RatingStars } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { listReviewsAdmin, adminDeleteReview } from '../../services/api';
import { AdminReview } from '../../types';

function ReviewCard({ item, onChanged }: { item: AdminReview; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const remove = () =>
    showAlert('Supprimer l\'avis', 'Supprimer définitivement cet avis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await adminDeleteReview(item.id);
            onChanged();
          } catch (e) {
            showAlert('Erreur', getErrorMessage(e, "L'opération a échoué."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.parties}>
            {item.raterName} → {item.ratedName}
          </Text>
          <RatingStars rating={item.stars} size={14} />
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      {item.comment ? <Text style={styles.comment}>“{item.comment}”</Text> : null}
      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tags}>
          {item.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.deleteBtn} disabled={busy} onPress={remove}>
        {busy ? (
          <ActivityIndicator color={COLORS.danger} size="small" />
        ) : (
          <>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </>
        )}
      </TouchableOpacity>
    </Card>
  );
}

export default function AdminReviewsScreen() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setItems(await listReviewsAdmin());
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les avis.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
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
            <EmptyState icon="star-outline" title="Aucun avis" message="Aucun avis à modérer." />
          ) : (
            items.map((item) => <ReviewCard key={item.id} item={item} onChanged={load} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  card: { marginBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  parties: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },
  comment: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, fontStyle: 'italic' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  tag: { backgroundColor: COLORS.borderLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  deleteText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.danger },
});
