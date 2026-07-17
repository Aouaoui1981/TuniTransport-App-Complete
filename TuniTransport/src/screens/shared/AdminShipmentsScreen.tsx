// ──────────────────────────────────────────────────────────────────────────
// THL — Supervision des envois (écran administrateur)
// Liste tous les envois de la plateforme avec recherche et permet d'annuler
// un envoi. Autorisation appliquée côté serveur (RPC is_admin).
// ──────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { Card, EmptyState, StatusBadge } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { listShipmentsAdmin, adminCancelShipment } from '../../services/api';
import { AdminShipment } from '../../types';

function ShipmentCard({ item, onChanged }: { item: AdminShipment; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const canCancel = item.status !== 'delivered' && item.status !== 'cancelled';

  const cancel = () =>
    showAlert('Annuler l\'envoi', 'Annuler définitivement cet envoi ?', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler l\'envoi',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await adminCancelShipment(item.id);
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
        <Text style={styles.route}>
          {item.pickupCity || '?'} → {item.deliveryCity || '?'}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.parties}>
        {item.senderName || '—'} → {item.transporterName || 'Non assigné'}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.type === 'small' ? 'Colis' : 'Gros objet'}</Text>
        {item.price != null ? <Text style={styles.price}>{item.price}€</Text> : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {canCancel ? (
        <TouchableOpacity style={styles.cancelBtn} disabled={busy} onPress={cancel}>
          {busy ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.cancelText}>Annuler l'envoi</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

export default function AdminShipmentsScreen() {
  const [items, setItems] = useState<AdminShipment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q: string) => {
    if (!IS_LIVE) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setItems(await listShipmentsAdmin(q));
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les envois.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher (expéditeur, transporteur)"
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => load(search.trim())}
        />
        {search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              load('');
            }}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(search.trim());
              }}
            />
          }
        >
          {items.length === 0 ? (
            <EmptyState icon="archive-outline" title="Aucun envoi" message="Aucun résultat." />
          ) : (
            items.map((item) => (
              <ShipmentCard key={item.id} item={item} onChanged={() => load(search.trim())} />
            ))
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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text },

  card: { marginBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  route: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  parties: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  meta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  price: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.secondary },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  cancelText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.danger },
});
