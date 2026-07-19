// ──────────────────────────────────────────────────────────────────────────
// THL — Aide & Support : contact direct + accès rapide à l'aide.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card } from '../../components';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { SUPPORT_EMAIL } from '../../content/legal';

export default function SupportScreen() {
  const navigation = useAppNavigation();

  const emailSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support THL')}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else showAlert('Contact', `Écrivez-nous à ${SUPPORT_EMAIL}`);
    } catch {
      showAlert('Contact', `Écrivez-nous à ${SUPPORT_EMAIL}`);
    }
  };

  const QUICK: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    {
      icon: 'flag-outline',
      label: 'Mes signalements',
      onPress: () => navigation.navigate('MyDisputes'),
    },
    {
      icon: 'refresh-outline',
      label: 'Politique de remboursement',
      onPress: () => navigation.navigate('Legal', { page: 'refund' }),
    },
    {
      icon: 'ban-outline',
      label: 'Objets interdits',
      onPress: () => navigation.navigate('Legal', { page: 'prohibited' }),
    },
    {
      icon: 'document-text-outline',
      label: 'Conditions générales',
      onPress: () => navigation.navigate('Legal', { page: 'terms' }),
    },
    {
      icon: 'mail-outline',
      label: 'Autres informations de contact',
      onPress: () => navigation.navigate('Legal', { page: 'contact' }),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Une question ? Nous sommes là.</Text>
        <Text style={styles.subtitle}>
          Un doute sur un envoi, un litige, un objet à expédier ? Notre équipe vous répond
          sous 24 h ouvrées.
        </Text>

        <TouchableOpacity style={styles.emailBtn} onPress={emailSupport} activeOpacity={0.85}>
          <Ionicons name="mail" size={20} color={COLORS.white} />
          <Text style={styles.emailBtnText}>Contacter le support par e-mail</Text>
        </TouchableOpacity>
        <Text style={styles.emailHint}>{SUPPORT_EMAIL}</Text>

        <View style={styles.urgent}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.urgentText}>
            Problème sur un envoi en cours ? Contactez d'abord l'autre partie via la messagerie,
            puis ouvrez « Signaler un problème » depuis l'envoi concerné.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Accès rapide</Text>
        <Card style={styles.menuCard}>
          {QUICK.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, idx < QUICK.length - 1 && styles.rowBorder]}
              onPress={item.onPress}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={18} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.xl,
    lineHeight: 21,
  },
  emailBtn: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  emailBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  emailHint: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  urgent: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },
  urgentText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.sm,
  },
  menuCard: { paddingVertical: 0, paddingHorizontal: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
});
