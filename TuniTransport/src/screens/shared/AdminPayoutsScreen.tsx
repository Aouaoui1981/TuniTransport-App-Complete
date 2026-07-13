// ──────────────────────────────────────────────────────────────────────────
// THL — Demandes de retrait (écran administrateur)
// Liste toutes les demandes de retrait des transporteurs et permet de les
// marquer « Payé » (après virement bancaire) ou « Refusé ». L'autorisation
// est appliquée côté serveur (RPC is_admin) — cet écran n'est qu'une interface.
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
import { Card, EmptyState } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { listPayoutRequestsAdmin, setPayoutStatus } from '../../services/api';
import { PayoutRequestAdmin, PayoutStatus } from '../../types';

type Filter = 'pending' | 'all';

const STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: COLORS.accent, bg: COLORS.accentLight },
  paid: { label: 'Payé', color: COLORS.secondaryDark, bg: COLORS.secondaryLight },
  rejected: { label: 'Refusé', color: COLORS.danger, bg: COLORS.dangerLight },
};

function RequestCard({ item, onChanged }: { item: PayoutRequestAdmin; onChanged: () => void }) {
  const [busy, setBusy] = useState<PayoutStatus | null>(null);
  const meta = STATUS_META[item.status];

  const decide = (status: PayoutStatus, confirmLabel: string, question: string) => {
    showAlert(confirmLabel, question, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: confirmLabel,
        onPress: async () => {
          setBusy(status);
          try {
            await setPayoutStatus(item.id, status);
            onChanged();
          } catch (e) {
            showAlert('Erreur', getErrorMessage(e, "L'opération a échoué."));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const createdLabel = new Date(item.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.transporterName}</Text>
          <Text style={styles.email}>{item.transporterEmail}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amount}>{item.amount}€</Text>
        <Text style={styles.date}>{createdLabel}</Text>
      </View>

      <View style={styles.bankBox}>
        <Text style={styles.bankLabel}>Titulaire</Text>
        <Text style={styles.bankValue}>{item.holder || '—'}</Text>
        <Text style={[styles.bankLabel, { marginTop: SPACING.xs }]}>IBAN / RIB</Text>
        <Text style={styles.bankIban} selectable>
          {item.iban || '—'}
        </Text>
      </View>

      {item.status === 'pending' ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={busy !== null}
            onPress={() =>
              decide('rejected', 'Refuser', 'Refuser cette demande de retrait ?')
            }
          >
            {busy === 'rejected' ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                <Text style={[styles.actionText, { color: COLORS.danger }]}>Refuser</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.payBtn]}
            disabled={busy !== null}
            onPress={() =>
              decide(
                'paid',
                'Marquer payé',
                `Confirmez-vous avoir versé ${item.amount}€ à ${item.transporterName} ?`
              )
            }
          >
            {busy === 'paid' ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                <Text style={[styles.actionText, { color: COLORS.white }]}>Marquer payé</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </Card>
  );
}

export default function AdminPayoutsScreen() {
  const [items, setItems] = useState<PayoutRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setItems(await listPayoutRequestsAdmin());
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les demandes.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((r) => (filter === 'pending' ? r.status === 'pending' : true));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.chips}>
        {(['pending', 'all'] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f === 'pending' ? 'En attente' : 'Toutes'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
          {filtered.length === 0 ? (
            <EmptyState
              icon="cash-outline"
              title="Aucune demande"
              message={
                filter === 'pending'
                  ? 'Aucune demande de retrait en attente.'
                  : 'Aucune demande de retrait pour le moment.'
              }
            />
          ) : (
            filtered.map((item) => <RequestCard key={item.id} item={item} onChanged={load} />)
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

  chips: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingBottom: SPACING.sm },
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

  card: { marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  name: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.md, marginTop: SPACING.md },
  amount: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.secondaryDark },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },

  bankBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  bankLabel: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary },
  bankValue: { fontSize: FONTS.sizes.sm, color: COLORS.text, marginTop: 1 },
  bankIban: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginTop: 1, letterSpacing: 0.5 },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  rejectBtn: { backgroundColor: COLORS.dangerLight },
  payBtn: { backgroundColor: COLORS.secondary },
  actionText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
