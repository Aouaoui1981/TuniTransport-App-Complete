// ──────────────────────────────────────────────────────────────────────────
// TuniTransport -- Profil -- STEP 10
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { Card, RatingStars, Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase, IS_LIVE } from '../../services/supabase';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { IdentityStatus } from '../../types';
import { LEGAL_PAGES, LegalPageKey } from '../../content/legal';

const MENU: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action?: 'editProfile' | 'notifications' | 'payment' | 'security';
  legalPage?: LegalPageKey;
}[] = [
  { icon: 'person-outline', label: 'Modifier le profil', action: 'editProfile' },
  { icon: 'card-outline', label: 'Moyens de paiement', action: 'payment' },
  { icon: 'notifications-outline', label: 'Notifications', action: 'notifications' },
  { icon: 'lock-closed-outline', label: 'Sécurité', action: 'security' },
  { icon: 'help-circle-outline', label: 'Aide & Support', legalPage: 'contact' },
  { icon: LEGAL_PAGES.terms.icon, label: LEGAL_PAGES.terms.title, legalPage: 'terms' },
  { icon: LEGAL_PAGES.refund.icon, label: LEGAL_PAGES.refund.title, legalPage: 'refund' },
  { icon: LEGAL_PAGES.privacy.icon, label: LEGAL_PAGES.privacy.title, legalPage: 'privacy' },
  { icon: LEGAL_PAGES.prohibited.icon, label: LEGAL_PAGES.prohibited.title, legalPage: 'prohibited' },
  { icon: LEGAL_PAGES.disclaimer.icon, label: LEGAL_PAGES.disclaimer.title, legalPage: 'disclaimer' },
  { icon: LEGAL_PAGES.about.icon, label: LEGAL_PAGES.about.title, legalPage: 'about' },
];

const IDENTITY_META: Record<
  IdentityStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }
> = {
  unsubmitted: {
    icon: 'document-outline',
    color: COLORS.textSecondary,
    bg: COLORS.borderLight,
    label: 'Vérifier mon identité',
  },
  pending: {
    icon: 'time-outline',
    color: COLORS.accent,
    bg: COLORS.accentLight,
    label: 'Vérification en cours',
  },
  verified: {
    icon: 'checkmark-circle',
    color: COLORS.success,
    bg: COLORS.secondaryLight,
    label: 'Identité vérifiée',
  },
  rejected: {
    icon: 'close-circle-outline',
    color: COLORS.danger,
    bg: COLORS.dangerLight,
    label: 'Document refusé -- appuyez pour réessayer',
  },
};

export default function ProfileScreen() {
  const navigation = useAppNavigation();
  const { user, logout, deleteAccount } = useAuth();

  if (!user) return null;

  const isSender = user.role === 'sender';
  const roleColor = isSender ? COLORS.primary : COLORS.secondary;
  // Sessions persisted before the KYC feature may lack identityStatus.
  const identityMeta = IDENTITY_META[user.identityStatus ?? 'unsubmitted'];
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const [securityModal, setSecurityModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showPaymentInfo = () => {
    const message = isSender
      ? "Vous réglez par carte bancaire de façon sécurisée (Stripe) au moment de payer un envoi. Aucune donnée de carte n'est conservée dans l'application."
      : "Vous recevez vos gains par virement sur les coordonnées bancaires que vous renseignez dans l'onglet « Livraisons » (bouton « Demander un retrait »).";
    showAlert('Moyens de paiement', message);
  };

  const openSecurity = () => {
    if (!IS_LIVE || !supabase) {
      showAlert('Sécurité', "La modification du mot de passe est disponible sur l'application en ligne.");
      return;
    }
    setNewPass('');
    setConfirmPass('');
    setSecurityModal(true);
  };

  const handleChangePassword = async () => {
    if (newPass.length < 6) {
      showAlert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPass !== confirmPass) {
      showAlert('Les mots de passe ne correspondent pas', 'Veuillez saisir le même mot de passe deux fois.');
      return;
    }
    setSavingPass(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password: newPass });
      if (error) throw error;
      setSecurityModal(false);
      setNewPass('');
      setConfirmPass('');
      showAlert('Mot de passe modifié', 'Votre mot de passe a été mis à jour avec succès.');
    } catch (e) {
      showAlert('Modification impossible', getErrorMessage(e));
    } finally {
      setSavingPass(false);
    }
  };

  const onMenuPress = (item: (typeof MENU)[number]) => {
    if (item.action === 'editProfile') {
      navigation.navigate('EditProfile');
    } else if (item.action === 'notifications') {
      navigation.navigate('Notifications');
    } else if (item.action === 'payment') {
      showPaymentInfo();
    } else if (item.action === 'security') {
      openSecurity();
    } else if (item.legalPage) {
      navigation.navigate('Legal', { page: item.legalPage });
    } else {
      showAlert(item.label, 'Cette section sera bientôt disponible.');
    }
  };

  const confirmLogout = () => {
    showAlert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const runDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      // La déconnexion est gérée par deleteAccount : l'app revient à l'accueil.
    } catch (e) {
      setDeleting(false);
      showAlert('Suppression impossible', getErrorMessage(e, 'Réessayez plus tard.'));
    }
  };

  const confirmDeleteAccount = () => {
    showAlert(
      'Supprimer mon compte',
      'Cette action est définitive. Votre profil et toutes vos données (envois, trajets, avis, messages, coordonnées bancaires) seront supprimés et ne pourront pas être récupérés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer définitivement', style: 'destructive', onPress: runDeleteAccount },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity */}
        <View style={styles.identity}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('EditProfile')}>
            <Avatar
              name={`${user.firstName} ${user.lastName}`}
              size={84}
              color={roleColor}
              uri={user.avatar}
            />
            <View style={[styles.cameraBtn, { backgroundColor: roleColor }]}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}22` }]}>
            <Ionicons
              name={isSender ? 'cube-outline' : 'car-outline'}
              size={13}
              color={roleColor}
            />
            <Text style={[styles.roleText, { color: roleColor }]}>
              {isSender ? 'Expéditeur' : 'Transporteur'}
            </Text>
          </View>
        </View>

        {/* Identity verification */}
        <TouchableOpacity
          style={[styles.identityCard, { backgroundColor: identityMeta.bg }]}
          onPress={() => navigation.navigate('IdentityVerification')}
        >
          <Ionicons name={identityMeta.icon} size={22} color={identityMeta.color} />
          <Text style={[styles.identityText, { color: identityMeta.color }]}>
            {identityMeta.label}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={identityMeta.color} />
        </TouchableOpacity>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statCol}>
            <RatingStars rating={user.rating} size={14} />
            <Text style={styles.statValue}>{user.rating.toFixed(1)}/5</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statCol}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('UserReviews', {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                rating: user.rating,
                totalRatings: user.totalRatings,
              })
            }
          >
            <Text style={styles.statBig}>{user.totalRatings}</Text>
            <Text style={styles.statLabel}>Avis ›</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.statLabel}>Membre depuis{'\n'}{memberSince}</Text>
          </View>
        </Card>

        {/* Menu */}
        <Card style={styles.menuCard}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, idx < MENU.length - 1 && styles.menuRowBorder]}
              onPress={() => onMenuPress(item)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* Danger zone : suppression définitive du compte */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={confirmDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.deleteText}>Supprimer mon compte</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>THL v1.1.0</Text>
      </ScrollView>

      <Modal
        visible={securityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSecurityModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity
                onPress={() => setSecurityModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Au moins 6 caractères"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
              autoComplete="new-password"
              value={newPass}
              onChangeText={setNewPass}
            />

            <Text style={styles.modalLabel}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ressaisissez le mot de passe"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
              value={confirmPass}
              onChangeText={setConfirmPass}
            />

            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: roleColor }, savingPass && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={savingPass}
              activeOpacity={0.85}
            >
              {savingPass ? (
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  modalSaveText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  identity: { alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.lg },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  name: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
  email: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs,
  },
  roleText: { fontSize: FONTS.sizes.sm, fontWeight: '800' },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  identityText: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700' },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.borderLight },
  statValue: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.text },
  statBig: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  menuCard: { paddingVertical: 0, paddingHorizontal: 0, marginBottom: SPACING.lg },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: FONTS.sizes.lg },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    minHeight: 44,
  },
  deleteText: { color: COLORS.danger, fontWeight: '600', fontSize: FONTS.sizes.sm },
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xl,
  },
});
