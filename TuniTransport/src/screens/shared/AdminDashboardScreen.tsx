// ──────────────────────────────────────────────────────────────────────────
// THL — Tableau de bord administrateur
// Point d'entrée du panneau admin : statistiques globales + accès aux
// vérifications d'identité et aux demandes de retrait. L'autorisation réelle
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
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { Card } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { fetchAdminStats } from '../../services/api';
import { AdminStats } from '../../types';

const STAT_TILES: { key: keyof AdminStats; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline', color: COLORS.primary },
  { key: 'transporters', label: 'Transporteurs', icon: 'car-outline', color: COLORS.secondary },
  { key: 'senders', label: 'Expéditeurs', icon: 'cube-outline', color: COLORS.info },
  { key: 'shipments', label: 'Envois', icon: 'archive-outline', color: COLORS.accent },
  { key: 'delivered', label: 'Livrés', icon: 'checkmark-done-outline', color: COLORS.success },
];

export default function AdminDashboardScreen() {
  const navigation = useAppNavigation();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const confirmLogout = () =>
    showAlert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);

  const load = useCallback(async () => {
    if (!IS_LIVE) {
      setStats(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setStats(await fetchAdminStats());
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les statistiques.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Administration</Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {user ? `${user.firstName} ${user.lastName}` : 'THL'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
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
        {!IS_LIVE ? (
          <Card>
            <Text style={styles.demoNote}>
              Le tableau de bord administrateur est disponible sur l'application en ligne.
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {STAT_TILES.map((tile) => (
                <View key={tile.key} style={styles.statTile}>
                  <View style={[styles.statIcon, { backgroundColor: `${tile.color}18` }]}>
                    <Ionicons name={tile.icon} size={18} color={tile.color} />
                  </View>
                  <Text style={styles.statValue}>{stats ? stats[tile.key] : 0}</Text>
                  <Text style={styles.statLabel}>{tile.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Gestion</Text>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminVerifications')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Vérifications d'identité</Text>
                  <Text style={styles.actionSub}>Approuver ou rejeter les documents KYC</Text>
                </View>
                {stats && stats.pendingKyc > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.pendingKyc}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminPayouts')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.secondaryLight }]}>
                  <Ionicons name="cash-outline" size={22} color={COLORS.secondaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Demandes de retrait</Text>
                  <Text style={styles.actionSub}>
                    {stats && stats.pendingPayoutsCount > 0
                      ? `${stats.pendingPayoutsAmount}€ en attente de versement`
                      : 'Traiter les demandes des transporteurs'}
                  </Text>
                </View>
                {stats && stats.pendingPayoutsCount > 0 ? (
                  <View style={[styles.badge, { backgroundColor: COLORS.accent }]}>
                    <Text style={styles.badgeText}>{stats.pendingPayoutsCount}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminUsers')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="people-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Gestion des utilisateurs</Text>
                  <Text style={styles.actionSub}>Suspendre, vérifier, nommer admin</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminShipments')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.accentLight }]}>
                  <Ionicons name="archive-outline" size={22} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Supervision des envois</Text>
                  <Text style={styles.actionSub}>Consulter et annuler les envois</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminReviews')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.secondaryLight }]}>
                  <Ionicons name="star-outline" size={22} color={COLORS.secondaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Modération des avis</Text>
                  <Text style={styles.actionSub}>Supprimer un avis inapproprié</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('AdminBroadcast')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Annonces</Text>
                  <Text style={styles.actionSub}>Diffuser un message à tous les utilisateurs</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Mon compte</Text>

            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('EditProfile')}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.borderLight }]}>
                  <Ionicons name="person-outline" size={22} color={COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Modifier le profil</Text>
                  <Text style={styles.actionSub}>Nom, photo, coordonnées</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} onPress={confirmLogout}>
              <Card style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.dangerLight }]}>
                  <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: COLORS.danger }]}>Se déconnecter</Text>
                </View>
              </Card>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  topTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  topSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 1 },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerLight,
  },
  demoNote: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', padding: SPACING.md },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statTile: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  actionSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '800' },
});
