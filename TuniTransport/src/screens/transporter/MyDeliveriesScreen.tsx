// ──────────────────────────────────────────────────────────────────────────
// THL — MyDeliveriesScreen (transporteur)
// Liste des envois pris en charge par le transporteur : en cours ET livrés.
// Comble l'absence d'un écran pour consulter les livraisons terminées.
// ──────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, StatusBadge, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAppNavigation, MainTabParamList } from '../../navigation/AppNavigator';
import { Shipment, ShipmentStatus, PayoutAccount, PayoutRequest } from '../../types';
import { IS_LIVE } from '../../services/supabase';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import {
  fetchPayoutAccount,
  savePayoutAccount,
  fetchPayoutRequests,
  requestPayout,
} from '../../services/api';

const MIN_PAYOUT = 10;

function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

const PAYOUT_STATUS_META: Record<PayoutRequest['status'], { label: string; color: string; bg: string }> = {
  pending: { label: 'En traitement', color: COLORS.accent, bg: COLORS.accentLight },
  paid: { label: 'Payé', color: COLORS.secondaryDark, bg: COLORS.secondaryLight },
  rejected: { label: 'Refusé', color: COLORS.danger, bg: COLORS.dangerLight },
};

type Filter = 'all' | 'in_progress' | 'delivered';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'delivered', label: 'Livrées' },
];

const IN_PROGRESS_GROUP: ShipmentStatus[] = ['accepted', 'collected', 'in_transit', 'arrived'];

export default function MyDeliveriesScreen() {
  const { user } = useAuth();
  const { shipments } = useData();
  const route = useRoute<RouteProp<MainTabParamList, 'Livraisons'>>();
  const [filter, setFilter] = useState<Filter>(route.params?.filter ?? 'all');

  const mine = shipments
    .filter((s) => s.transporterId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Portefeuille en deux parts :
  //  • Disponible  : envois livrés (le destinataire a confirmé) — acquis au transporteur.
  //  • En attente  : envois payés et pris en charge mais pas encore confirmés livrés
  //                  — bloqués jusqu'à la confirmation de livraison par l'expéditeur.
  const availableBalance = mine
    .filter((s) => s.status === 'delivered')
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const pendingBalance = mine
    .filter((s) => s.paidAt != null && IN_PROGRESS_GROUP.includes(s.status))
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  // ── Portefeuille : coordonnées bancaires & demandes de retrait ───────────
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [holder, setHolder] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const loadPayout = useCallback(() => {
    if (!IS_LIVE || !user?.id) return;
    fetchPayoutAccount(user.id).then(setAccount).catch(() => undefined);
    fetchPayoutRequests(user.id).then(setRequests).catch(() => undefined);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadPayout(); }, [loadPayout]));
  useEffect(() => { loadPayout(); }, [loadPayout]);

  // Montant déjà réservé par des demandes en cours ou payées.
  const reserved = requests
    .filter((r) => r.status === 'pending' || r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);
  const withdrawable = Math.max(0, availableBalance - reserved);
  const hasIban = !!account?.iban;
  const canWithdraw = hasIban && withdrawable >= MIN_PAYOUT && !requesting;

  function openBankModal() {
    setHolder(account?.holder ?? '');
    setIban(account?.iban ?? '');
    setBankName(account?.bankName ?? '');
    setBankModal(true);
  }

  async function handleSaveBank() {
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    if (!cleanIban) {
      showAlert('IBAN requis', 'Veuillez saisir votre IBAN ou RIB.');
      return;
    }
    setSaving(true);
    try {
      await savePayoutAccount(user!.id, {
        holder: holder.trim(),
        iban: cleanIban,
        bankName: bankName.trim() || undefined,
      });
      setBankModal(false);
      loadPayout();
      showAlert('Enregistré', 'Vos coordonnées bancaires ont été enregistrées.');
    } catch (e) {
      showAlert('Enregistrement impossible', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleWithdraw() {
    if (!hasIban) {
      showAlert('Coordonnées bancaires manquantes', 'Ajoutez d\'abord votre IBAN pour être payé.');
      return;
    }
    showAlert(
      'Demander un retrait',
      `Demander le versement de ${withdrawable}€ sur le compte ${maskIban(account!.iban)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setRequesting(true);
            try {
              await requestPayout();
              loadPayout();
              showAlert(
                'Demande envoyée',
                'Votre demande de retrait a été enregistrée. Le versement sera effectué sur votre compte bancaire.'
              );
            } catch (e) {
              showAlert('Retrait impossible', getErrorMessage(e));
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  }

  const filtered = mine.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return IN_PROGRESS_GROUP.includes(s.status);
    return s.status === 'delivered';
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mes livraisons</Text>
          <Text style={styles.subtitle}>Portefeuille du transporteur</Text>
        </View>
      </View>

      <View style={styles.walletWrap}>
        <View style={[styles.walletCard, styles.walletAvailable]}>
          <View style={styles.walletIconRow}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.secondaryDark} />
            <Text style={[styles.walletLabel, { color: COLORS.secondaryDark }]}>Disponible</Text>
          </View>
          <Text style={[styles.walletAmount, { color: COLORS.secondaryDark }]}>{availableBalance}€</Text>
          <Text style={styles.walletHint}>Acquis après livraison confirmée</Text>
        </View>

        <View style={[styles.walletCard, styles.walletPending]}>
          <View style={styles.walletIconRow}>
            <Ionicons name="time" size={15} color={COLORS.accent} />
            <Text style={[styles.walletLabel, { color: COLORS.accent }]}>En attente</Text>
          </View>
          <Text style={[styles.walletAmount, { color: COLORS.accent }]}>{pendingBalance}€</Text>
          <Text style={styles.walletHint}>Bloqué jusqu'à confirmation de l'expéditeur</Text>
        </View>
      </View>

      {IS_LIVE && (
        <View style={styles.payoutWrap}>
          <TouchableOpacity style={styles.bankRow} onPress={openBankModal} activeOpacity={0.7}>
            <Ionicons name="card-outline" size={20} color={COLORS.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bankRowLabel}>Coordonnées bancaires</Text>
              <Text style={[styles.bankRowValue, !hasIban && { color: COLORS.accent }]}>
                {hasIban ? maskIban(account!.iban) : 'Ajouter un RIB pour être payé'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.withdrawBtn, !canWithdraw && styles.withdrawBtnDisabled]}
            onPress={handleWithdraw}
            disabled={!canWithdraw}
            activeOpacity={0.85}
          >
            {requesting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="cash-outline" size={18} color={COLORS.white} />
                <Text style={styles.withdrawBtnText}>
                  Demander un retrait{withdrawable > 0 ? ` (${withdrawable}€)` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {!hasIban ? (
            <Text style={styles.withdrawNote}>Ajoutez d'abord votre IBAN pour pouvoir retirer.</Text>
          ) : withdrawable < MIN_PAYOUT ? (
            <Text style={styles.withdrawNote}>Minimum {MIN_PAYOUT}€ disponible pour demander un retrait.</Text>
          ) : null}

          {requests.length > 0 && (
            <View style={styles.reqList}>
              <Text style={styles.reqHeader}>Mes demandes de retrait</Text>
              {requests.slice(0, 4).map((r) => {
                const meta = PAYOUT_STATUS_META[r.status];
                return (
                  <View key={r.id} style={styles.reqRow}>
                    <Text style={styles.reqAmount}>{r.amount}€</Text>
                    <View style={[styles.reqBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.reqBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={styles.reqDate}>
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <DeliveryCard shipment={item} />}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon="cube-outline"
              title="Aucune livraison"
              message={
                filter === 'delivered'
                  ? "Vos livraisons terminées apparaîtront ici."
                  : "Les envois que vous prenez en charge apparaîtront ici."
              }
            />
          </Card>
        }
      />

      <Modal visible={bankModal} transparent animationType="slide" onRequestClose={() => setBankModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coordonnées bancaires</Text>
              <TouchableOpacity onPress={() => setBankModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Ces informations servent à vous verser vos gains. Elles restent privées et ne sont
              jamais partagées avec les autres utilisateurs.
            </Text>

            <Text style={styles.modalLabel}>Titulaire du compte</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom du titulaire"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="words"
              value={holder}
              onChangeText={setHolder}
            />

            <Text style={styles.modalLabel}>IBAN / RIB</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="FR76 / TN59 …"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
              autoCorrect={false}
              value={iban}
              onChangeText={setIban}
            />

            <Text style={styles.modalLabel}>Banque (facultatif)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de la banque"
              placeholderTextColor={COLORS.textLight}
              value={bankName}
              onChangeText={setBankName}
            />

            <TouchableOpacity
              style={[styles.modalSave, saving && { opacity: 0.6 }]}
              onPress={handleSaveBank}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function DeliveryCard({ shipment }: { shipment: Shipment }) {
  const navigation = useAppNavigation();
  const isSmall = shipment.type === 'small';

  return (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: shipment.id })}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: isSmall ? COLORS.primaryLight : COLORS.accentLight }]}>
          <Ionicons
            name={isSmall ? 'cube' : 'bicycle'}
            size={20}
            color={isSmall ? COLORS.primary : COLORS.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {shipment.pickupAddress.city} → {shipment.deliveryAddress.city}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(shipment.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <StatusBadge status={shipment.status} />
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.meta}>
          {shipment.weight ? `${shipment.weight} kg` : 'Gros objet'}
        </Text>
        {shipment.price != null ? <Text style={styles.price}>{shipment.price}€</Text> : null}
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },

  walletWrap: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  walletCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  walletAvailable: { backgroundColor: COLORS.secondaryLight, borderColor: COLORS.secondary },
  walletPending: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  walletIconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  walletLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  walletAmount: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginTop: SPACING.xs },
  walletHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },

  payoutWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  bankRowLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  bankRowValue: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 1 },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
    marginTop: SPACING.md,
  },
  withdrawBtnDisabled: { backgroundColor: COLORS.textLight, opacity: 0.7 },
  withdrawBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  withdrawNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  reqList: { marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.md },
  reqHeader: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  reqAmount: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.text, width: 64 },
  reqBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  reqBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  reqDate: { flex: 1, textAlign: 'right', fontSize: FONTS.sizes.xs, color: COLORS.textLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  modalHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalSave: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  modalSaveText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },

  chipsWrap: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  chips: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  chipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  list: { padding: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },

  card: { marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  cardDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  meta: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  price: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.secondary },
});
