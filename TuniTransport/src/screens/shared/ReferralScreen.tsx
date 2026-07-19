// ──────────────────────────────────────────────────────────────────────────
// THL — Parrainage : code de l'utilisateur, partage, solde, filleuls.
// ──────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { fetchReferralSummary, listMyReferrals } from '../../services/api';
import { ReferralSummary, ReferralItem, ReferralItemStatus } from '../../types';

const APP_URL = 'https://thl-colis-app-complete.vercel.app';

const STATUS_META: Record<ReferralItemStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: COLORS.accent },
  rewarded: { label: 'Récompensé', color: COLORS.success },
  expired: { label: 'Expiré', color: COLORS.textLight },
};

export default function ReferralScreen() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setLoading(false);
      return;
    }
    try {
      const [s, list] = await Promise.all([fetchReferralSummary(), listMyReferrals()]);
      setSummary(s);
      setItems(list);
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger le parrainage.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shareMessage = summary
    ? `Rejoins-moi sur THL pour envoyer des colis entre la France et la Tunisie 📦🚢\n` +
      `Utilise mon code de parrainage ${summary.code} à l'inscription : tu gagnes 5 € sur ta première opération.\n${APP_URL}`
    : '';

  const onShare = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // annulé — rien à faire
    }
  };

  const onCopy = async () => {
    if (!summary) return;
    try {
      const nav = (globalThis as any)?.navigator;
      if (Platform.OS === 'web' && nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(summary.code);
        showAlert('Copié', 'Votre code de parrainage a été copié.');
        return;
      }
      // Natif : proposer le partage (qui inclut le code) à défaut de presse-papiers.
      await Share.share({ message: shareMessage });
    } catch {
      showAlert('Votre code', summary.code);
    }
  };

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
        contentContainerStyle={styles.scroll}
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
        {/* Solde */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.secondary} />
          </View>
          <Text style={styles.balanceValue}>{(summary?.balance ?? 0).toFixed(0)} €</Text>
          <Text style={styles.balanceLabel}>Crédit de parrainage cumulé</Text>
          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{summary?.invited ?? 0}</Text>
              <Text style={styles.statLabel}>Invités</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{summary?.rewarded ?? 0}</Text>
              <Text style={styles.statLabel}>Récompensés</Text>
            </View>
          </View>
        </Card>

        {/* Code + partage */}
        <Text style={styles.sectionTitle}>Votre code de parrainage</Text>
        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{summary?.code ?? '—'}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={onCopy} accessibilityLabel="Copier le code">
            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={18} color={COLORS.white} />
          <Text style={styles.shareBtnText}>Partager mon invitation</Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Ionicons name="gift-outline" size={16} color={COLORS.accent} />
          <Text style={styles.infoText}>
            Vous gagnez 10 € et votre filleul 5 €, dès sa première opération sur THL (envoi
            livré ou trajet réalisé), dans un délai d'un mois.
          </Text>
        </View>

        {/* Filleuls */}
        <Text style={styles.sectionTitle}>Vos filleuls</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>
            Vous n'avez pas encore invité de filleul. Partagez votre code pour commencer !
          </Text>
        ) : (
          items.map((it, idx) => {
            const meta = STATUS_META[it.status];
            const date = new Date(it.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <Card key={idx} style={styles.referralItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referralName}>{it.referredName || 'Filleul'}</Text>
                  <Text style={styles.referralDate}>Invité le {date}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </Card>
            );
          })
        )}

        {Platform.OS === 'web' ? null : <View style={{ height: SPACING.xl }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },

  balanceCard: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xl },
  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(45,212,191,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  balanceValue: { fontSize: 40, fontWeight: '800', color: COLORS.text },
  balanceLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, gap: SPACING.xl },
  statCol: { alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  codeRow: { flexDirection: 'row', gap: SPACING.sm },
  codeBox: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  codeText: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: 4 },
  copyBtn: {
    width: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  shareBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  info: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(245,179,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,179,66,0.25)',
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },

  empty: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  referralItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  referralName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  referralDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
});
