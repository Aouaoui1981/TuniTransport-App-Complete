// ──────────────────────────────────────────────────────────────────────────
// THL — Gestion des utilisateurs (écran administrateur)
// Recherche, suspension/réactivation, attribution du rôle admin et
// vérification manuelle de l'identité. Autorisation appliquée côté serveur.
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
import { Card, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { IS_LIVE } from '../../services/supabase';
import {
  listUsersAdmin,
  setUserSuspended,
  setUserAdmin,
  adminSetIdentity,
} from '../../services/api';
import { AdminUser } from '../../types';

const IDENTITY_LABEL: Record<string, { label: string; color: string }> = {
  verified: { label: 'Vérifié', color: COLORS.success },
  pending: { label: 'En attente', color: COLORS.accent },
  rejected: { label: 'Rejeté', color: COLORS.danger },
  unsubmitted: { label: 'Non soumis', color: COLORS.textLight },
};

function UserCard({ item, self, onChanged }: { item: AdminUser; self: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, "L'opération a échoué."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, message: string, fn: () => Promise<void>) =>
    showAlert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: title, onPress: () => run(fn) },
    ]);

  const idMeta = IDENTITY_LABEL[item.identityStatus] ?? IDENTITY_LABEL.unsubmitted;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
            {self ? ' (vous)' : ''}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
        </View>
        {busy ? <ActivityIndicator color={COLORS.primary} /> : null}
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: item.role === 'transporter' ? COLORS.secondaryLight : COLORS.primaryLight }]}>
          <Text style={[styles.badgeText, { color: item.role === 'transporter' ? COLORS.secondaryDark : COLORS.primary }]}>
            {item.role === 'transporter' ? 'Transporteur' : 'Expéditeur'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${idMeta.color}22` }]}>
          <Text style={[styles.badgeText, { color: idMeta.color }]}>{idMeta.label}</Text>
        </View>
        {item.isAdmin ? (
          <View style={[styles.badge, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={[styles.badgeText, { color: COLORS.primary }]}>Admin</Text>
          </View>
        ) : null}
        {item.suspended ? (
          <View style={[styles.badge, { backgroundColor: COLORS.dangerLight }]}>
            <Text style={[styles.badgeText, { color: COLORS.danger }]}>Suspendu</Text>
          </View>
        ) : null}
      </View>

      {!self ? (
        <View style={styles.actions}>
          {item.suspended ? (
            <TouchableOpacity
              style={[styles.actBtn, { backgroundColor: COLORS.secondaryLight }]}
              disabled={busy}
              onPress={() => run(() => setUserSuspended(item.id, false))}
            >
              <Ionicons name="play-circle-outline" size={16} color={COLORS.secondaryDark} />
              <Text style={[styles.actText, { color: COLORS.secondaryDark }]}>Réactiver</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actBtn, { backgroundColor: COLORS.dangerLight }]}
              disabled={busy}
              onPress={() =>
                confirm('Suspendre', `Suspendre le compte de ${item.firstName} ? Il ne pourra plus se connecter.`, () =>
                  setUserSuspended(item.id, true)
                )
              }
            >
              <Ionicons name="ban-outline" size={16} color={COLORS.danger} />
              <Text style={[styles.actText, { color: COLORS.danger }]}>Suspendre</Text>
            </TouchableOpacity>
          )}

          {item.identityStatus !== 'verified' ? (
            <TouchableOpacity
              style={[styles.actBtn, { backgroundColor: COLORS.secondaryLight }]}
              disabled={busy}
              onPress={() => run(() => adminSetIdentity(item.id, 'verified'))}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.secondaryDark} />
              <Text style={[styles.actText, { color: COLORS.secondaryDark }]}>Vérifier</Text>
            </TouchableOpacity>
          ) : null}

          {item.isAdmin ? (
            <TouchableOpacity
              style={[styles.actBtn, { backgroundColor: COLORS.borderLight }]}
              disabled={busy}
              onPress={() =>
                confirm('Retirer admin', `Retirer les droits admin de ${item.firstName} ?`, () =>
                  setUserAdmin(item.id, false)
                )
              }
            >
              <Ionicons name="shield-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.actText, { color: COLORS.textSecondary }]}>Retirer admin</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actBtn, { backgroundColor: COLORS.primaryLight }]}
              disabled={busy}
              onPress={() =>
                confirm('Nommer admin', `Donner les droits admin à ${item.firstName} ?`, () =>
                  setUserAdmin(item.id, true)
                )
              }
            >
              <Ionicons name="shield-half-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.actText, { color: COLORS.primary }]}>Nommer admin</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </Card>
  );
}

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
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
      setItems(await listUsersAdmin(q));
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible de charger les utilisateurs.'));
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
          placeholder="Rechercher (nom, e-mail, téléphone)"
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
            <EmptyState icon="people-outline" title="Aucun utilisateur" message="Aucun résultat." />
          ) : (
            items.map((item) => (
              <UserCard key={item.id} item={item} self={item.id === user?.id} onChanged={() => load(search.trim())} />
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  name: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  email: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 1 },
  phone: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 1 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  actText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
