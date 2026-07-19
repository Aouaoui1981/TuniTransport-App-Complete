// ──────────────────────────────────────────────────────────────────────────
// TuniTransport -- Vérifications d'identité (écran administrateur)
// Liste les soumissions KYC en attente avec les photos des documents et
// permet de les approuver / rejeter. L'autorisation réelle est appliquée
// côté serveur (RPC + RLS) — cet écran n'est qu'une interface.
// ──────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
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
import {
  PendingIdentity,
  listPendingIdentities,
  getIdentityDocumentUrl,
  reviewIdentity,
  notifyIdentityApproved,
} from '../../services/api';

const DOCUMENT_LABELS: Record<string, string> = {
  cin: "Carte d'identité",
  passport: 'Passeport',
};

// Motifs de rejet fréquents (remplissent le champ d'un tap). Le premier vise
// la non-concordance du nom déclaré avec la pièce d'identité.
const PRESET_REASONS = [
  'Le nom / prénom ne correspond pas à ceux du compte.',
  'Document illisible ou photo floue.',
  'Document expiré.',
  "Le document ne correspond pas au type sélectionné.",
];

function PendingCard({ item, onDone }: { item: PendingIdentity; onDone: () => void }) {
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        const front = await getIdentityDocumentUrl(item.frontPath);
        if (isMounted.current) setFrontUrl(front);
        if (item.backPath) {
          const back = await getIdentityDocumentUrl(item.backPath);
          if (isMounted.current) setBackUrl(back);
        }
      } catch {
        // Les vignettes restent en chargement — la décision reste possible.
      }
    })();
    return () => {
      isMounted.current = false;
    };
  }, [item.frontPath, item.backPath]);

  const decide = async (approve: boolean) => {
    setBusy(approve ? 'approve' : 'reject');
    try {
      await reviewIdentity(item.id, approve, approve ? undefined : reason.trim() || undefined);
      if (approve) {
        // Notification e-mail best-effort : ne doit pas bloquer l'approbation.
        try {
          await notifyIdentityApproved(item.id);
        } catch (mailErr) {
          console.warn("Notification e-mail d'approbation non envoyée:", mailErr);
        }
      }
      showAlert(
        approve ? 'Identité approuvée' : 'Document rejeté',
        approve
          ? `${item.firstName} ${item.lastName} a été notifié (profil + e-mail).`
          : `${item.firstName} ${item.lastName} a été notifié dans son profil.`
      );
      onDone();
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, "L'opération a échoué. Réessayez."));
    } finally {
      if (isMounted.current) setBusy(null);
    }
  };

  const submittedLabel = item.submittedAt
    ? new Date(item.submittedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={styles.docBadge}>
          <Ionicons name="document-text-outline" size={13} color={COLORS.primary} />
          <Text style={styles.docBadgeText}>
            {DOCUMENT_LABELS[item.documentType] ?? item.documentType}
          </Text>
        </View>
      </View>
      <Text style={styles.submittedAt}>Soumis le {submittedLabel}</Text>

      {/* Contrôle de concordance du nom : le nom sur la pièce DOIT correspondre. */}
      <View style={styles.nameCheck}>
        <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.nameCheckText}>
          Le nom sur la pièce doit correspondre à{' '}
          <Text style={styles.nameCheckStrong}>
            {item.firstName} {item.lastName}
          </Text>
          . Sinon, refusez la vérification.
        </Text>
      </View>

      <View style={styles.photosRow}>
        <View style={styles.photoWrap}>
          <Text style={styles.photoLabel}>Recto</Text>
          {frontUrl ? (
            <Image source={{ uri: frontUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoLoading]}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}
        </View>
        {item.backPath ? (
          <View style={styles.photoWrap}>
            <Text style={styles.photoLabel}>Verso</Text>
            {backUrl ? (
              <Image source={{ uri: backUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoLoading]}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.presetRow}>
        {PRESET_REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={styles.presetChip}
            onPress={() => setReason(r)}
            accessibilityRole="button"
            accessibilityLabel={`Motif : ${r}`}
          >
            <Text style={styles.presetChipText} numberOfLines={1}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.reasonInput}
        placeholder="Motif du rejet (visible par l'utilisateur)"
        placeholderTextColor={COLORS.textLight}
        value={reason}
        onChangeText={setReason}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          disabled={busy !== null}
          onPress={() => decide(false)}
        >
          {busy === 'reject' ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
              <Text style={[styles.actionText, { color: COLORS.danger }]}>Rejeter</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          disabled={busy !== null}
          onPress={() => decide(true)}
        >
          {busy === 'approve' ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
              <Text style={[styles.actionText, { color: COLORS.white }]}>Approuver</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function AdminVerificationsScreen() {
  const [items, setItems] = useState<PendingIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listPendingIdentities());
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
              title="Aucune demande en attente"
              message="Toutes les vérifications d'identité ont été traitées."
            />
          ) : (
            items.map((item) => <PendingCard key={item.id} item={item} onDone={load} />)
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, marginRight: SPACING.sm },
  name: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  docBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.primary },
  submittedAt: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 4 },
  nameCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },
  nameCheckText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18 },
  nameCheckStrong: { color: COLORS.text, fontWeight: '800' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.md },
  presetChip: {
    maxWidth: '100%',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  presetChipText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.danger },
  photosRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  photoWrap: { flex: 1 },
  photoLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  photo: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
  },
  photoLoading: { alignItems: 'center', justifyContent: 'center' },
  reasonInput: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
  },
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
  approveBtn: { backgroundColor: COLORS.success },
  actionText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
