// ──────────────────────────────────────────────────────────────────────────
// THL — Détail complet d'un envoi (écran administrateur)
// Toutes les informations : expéditeur + adresse, adresse de collecte/livraison,
// transporteur, prix, poids, gros objets, prix final convenu, dates…
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card, StatusBadge } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { fetchAdminShipmentDetail } from '../../services/api';
import { AdminShipmentDetail, Address } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

function fmtDate(d?: string): string | undefined {
  if (!d) return undefined;
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addressLines(a?: Address): string | undefined {
  if (!a) return undefined;
  const parts = [a.street, [a.postalCode, a.city].filter(Boolean).join(' '), a.country].filter(
    (x) => x && x.trim()
  );
  return parts.join('\n') || undefined;
}

export default function AdminShipmentDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AdminShipmentDetail'>>();
  const { shipmentId } = route.params;
  const [data, setData] = useState<AdminShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setLoading(false);
      return;
    }
    try {
      setData(await fetchAdminShipmentDetail(shipmentId));
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, "Impossible de charger l'envoi."));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

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

  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Envoi introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLarge = data.type !== 'small';
  const money = (n?: number) => (n != null ? `${n} €` : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* En-tête */}
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.route}>
              {data.pickup?.city || '?'} → {data.delivery?.city || '?'}
            </Text>
            <StatusBadge status={data.status} />
          </View>
          <Row label="Type" value={isLarge ? 'Gros objet (enchères)' : 'Colis léger'} />
          <Row label="Référence" value={data.id.slice(0, 8) + '…'} />
        </Card>

        {/* Envoi */}
        <Text style={styles.section}>Envoi</Text>
        <Card style={styles.card}>
          <Row label="Poids" value={data.weight != null ? `${data.weight} kg` : undefined} />
          <Row label="Dimensions" value={data.dimensions} />
          <Row label="Description" value={data.description} />
          <Row label="Prix" value={money(data.price)} />
          {isLarge && data.acceptedBid ? (
            <Row label="Prix final convenu" value={money(data.acceptedBid.price)} />
          ) : null}
          <Row
            label="Paiement"
            value={
              data.paymentMethod === 'cash'
                ? 'Espèces à la remise'
                : data.paymentMethod === 'card'
                  ? 'Carte (en ligne)'
                  : undefined
            }
          />
          <Row label="Offres reçues" value={data.bidsCount} />
        </Card>

        {/* Objets (gros objets) */}
        {data.items && data.items.length > 0 ? (
          <>
            <Text style={styles.section}>Objets</Text>
            <Card style={styles.card}>
              {data.items.map((it, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowLabel}>
                    {it.quantity ? `${it.quantity}× ` : ''}
                    {it.name}
                  </Text>
                  <Text style={styles.rowValue}>{it.weight != null ? `${it.weight} kg` : ''}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Expéditeur */}
        <Text style={styles.section}>Expéditeur</Text>
        <Card style={styles.card}>
          <Row label="Nom" value={data.sender.name} />
          <Row label="E-mail" value={data.sender.email} />
          <Row label="Téléphone" value={data.sender.phone} />
          <Row label="Adresse de collecte" value={addressLines(data.pickup)} />
          <Row label="Contact collecte" value={data.pickup?.contactName} />
          <Row label="Tél. collecte" value={data.pickup?.contactPhone} />
        </Card>

        {/* Transporteur */}
        <Text style={styles.section}>Transporteur</Text>
        <Card style={styles.card}>
          {data.transporter ? (
            <>
              <Row label="Nom" value={data.transporter.name} />
              <Row label="E-mail" value={data.transporter.email} />
              <Row label="Téléphone" value={data.transporter.phone} />
            </>
          ) : (
            <Text style={styles.muted}>Aucun transporteur assigné.</Text>
          )}
          <Row label="Adresse de livraison" value={addressLines(data.delivery)} />
          <Row label="Contact livraison" value={data.delivery?.contactName} />
          <Row label="Tél. livraison" value={data.delivery?.contactPhone} />
          {data.acceptedBid?.estimatedDelivery ? (
            <Row label="Livraison estimée" value={fmtDate(data.acceptedBid.estimatedDelivery)} />
          ) : null}
        </Card>

        {/* Dates */}
        <Text style={styles.section}>Suivi</Text>
        <Card style={styles.card}>
          <Row label="Créé le" value={fmtDate(data.createdAt)} />
          <Row label="Collecté le" value={fmtDate(data.collectedAt)} />
          <Row label="Livré le" value={fmtDate(data.deliveredAt)} />
          <Row label="Payé le" value={fmtDate(data.paidAt)} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxxl },
  card: { marginBottom: SPACING.md, gap: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  route: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text },
  section: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  rowLabel: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  rowValue: {
    flex: 1.4,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, paddingVertical: SPACING.xs },
});
