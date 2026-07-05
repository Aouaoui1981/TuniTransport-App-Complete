// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Profil — STEP 10
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, RatingStars, Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';

const MENU: { icon: keyof typeof Ionicons.glyphMap; label: string; action?: 'editProfile' }[] = [
  { icon: 'person-outline', label: 'Modifier le profil', action: 'editProfile' },
  { icon: 'card-outline', label: 'Moyens de paiement' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'lock-closed-outline', label: 'Sécurité' },
  { icon: 'help-circle-outline', label: 'Aide & Support' },
  { icon: 'document-text-outline', label: 'Conditions d’utilisation' },
  { icon: 'information-circle-outline', label: 'À propos' },
];

export default function ProfileScreen() {
  const navigation = useAppNavigation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isSender = user.role === 'sender';
  const roleColor = isSender ? COLORS.primary : COLORS.secondary;
  const memberSince = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const onMenuPress = (item: (typeof MENU)[number]) => {
    if (item.action === 'editProfile') {
      navigation.navigate('EditProfile');
    } else {
      Alert.alert(item.label, 'Cette section sera bientôt disponible.');
    }
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity */}
        <View style={styles.identity}>
          <View>
            <Avatar name={`${user.firstName} ${user.lastName}`} size={84} color={roleColor} />
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: roleColor }]}
              onPress={() => Alert.alert('Photo de profil', 'Cette option sera bientôt disponible.')}
            >
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
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

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statCol}>
            <RatingStars rating={user.rating} size={14} />
            <Text style={styles.statValue}>{user.rating.toFixed(1)}/5</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statBig}>{user.totalRatings}</Text>
            <Text style={styles.statLabel}>Avis</Text>
          </View>
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

        <Text style={styles.version}>TuniTransport v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
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
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xl,
  },
});
