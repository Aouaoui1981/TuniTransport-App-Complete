// ──────────────────────────────────────────────────────────────────────────
// THL — Signalements / litiges (écran administrateur)
// Liste les signalements (les non traités d'abord) et permet de les passer en
// « en cours », « résolu » ou « rejeté » avec une réponse visible par l'usager.
// ──────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { listDisputesAdmin, setDisputeStatus } from '../../services/api';
import { AdminDispute, DisputeStatus } from '../../types';
import { DISPUTE_CATEGORY_LABEL, DISPUTE_STATUS_LABEL } from '../../content/disputes';

const STATUS_COLOR: Record<DisputeStatus, string> = {
  open: COLORS.accent,
  in_review: COLORS.primary,
  resolved: COLORS.success,
  rejected: COLORS.danger,
};

function DisputeCard({ item, onDone }: { item: AdminDispute; onDone: () => void }) {
  const [note, setNote] = useState(item.adminNote ?? '');
  const [busy, setBusy] = useState<DisputeStatus | null>(null);
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  const apply = async (status: DisputeStatus) => {
    setBusy(status);
    try {
      await setDisputeStatus(item.id, status, note.trim() || undefined);
      onDone();
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, "L'opération a échoué."));
    } finally {
      if (isMounted.current) setBusy(null);
    }
  };

  const date = new Date(item.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const color = STATUS_COLOR[item.status];
  const done = item.status === 'resolved' || item.status === 'rejected';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{DISPUTE_CATEGORY_LABEL[item.category]}</Text>
          <Text style={styles.reporter}>
            {item.reporterName || '—'} · {item.reporterRole === 'transporter' ? 'Transporteur' : 'Expéditeur'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.pillText, { color }]}>{DISPUTE_STATUS_LABEL[item.status]}</Text>
        </View>
      </View>
      <Text style={styles.date}>Signalé le {date}</Text>
      <Text style={styles.shipmentId}>Envoi : {item.shipmentId.slice(0, 8)}…</Text>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

      <TextInput
        style={styles.noteInput}
        placeholder="Réponse / décision (visible par l'utilisateur)"
        placeholderTextColor={COLORS.textLight}
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actionsRow}>
        {!done ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primaryLight }]}
            disabled={busy !== null}
            onPress={() => apply('in_review')}
          >
            {busy === 'in_review' ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Text style={[styles.actionText, { color: COLORS.primary }]}>En cours</Text>
            )}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.dangerLight }]}
          disabled={busy !== null}
          onPress={() => apply('rejected')}
        >
          {busy === 'rejected' ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <Text style={[styles.actionText, { color: COLORS.danger }]}>Rejeter</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
          disabled={busy !== null}
          onPress={() => apply('resolved')}
        >
          {busy === 'resolved' ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={[styles.actionText, { color: COLORS.white }]}>Résoudre</Text>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function AdminDisputesScreen() {
  const [items, setItems] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listDisputesAdmin());
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les signalements.'));
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
            <EmptyState
              icon="shield-checkmark-outline"
              title="Aucun signalement"
              message="Aucun litige n'a été signalé pour le moment."
            />
          ) : (
            items.map((item) => <DisputeCard key={item.id} item={item} onDone={load} />)
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
  card: { marginBottom: SPACING.md, gap: SPACING.xs },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  category: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  reporter: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },
  shipmentId: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },
  desc: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.xs },
  pill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  pillText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  noteInput: {
    marginTop: SPACING.sm,
    minHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
    textAlignVertical: 'top',
  },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  actionText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
