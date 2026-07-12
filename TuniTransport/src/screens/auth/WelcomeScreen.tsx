// ──────────────────────────────────────────────────────────────────────────
// THL — WelcomeScreen : page d'accueil style "landing" (fond clair, titre
// XXL avec mot accentué, points de confiance en pastilles pastel, CTA pleins)
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAppNavigation } from '../../navigation/AppNavigator';

const TRUST_POINTS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: 'id-card-outline',
    title: 'Identités vérifiées',
    text: "Chaque membre passe une vérification d'identité avant d'expédier ou de transporter.",
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Paiement sécurisé',
    text: "L'argent est encaissé en ligne et la réservation est confirmée automatiquement.",
  },
  {
    icon: 'navigate-outline',
    title: 'Suivi en temps réel',
    text: 'Suivez votre colis de la collecte à la livraison, étape par étape.',
  },
];

export default function WelcomeScreen() {
  const navigation = useAppNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="cube" size={20} color={COLORS.white} />
            </View>
            <Text style={styles.wordmark}>
              THL<Text style={styles.wordmarkDot}>.</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.loginChip}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginChipText}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Vos colis entre la France et la Tunisie,{' '}
            <Text style={styles.heroAccent}>en toute confiance</Text>
          </Text>
          <Text style={styles.heroSub}>
            THL met en relation les expéditeurs avec des transporteurs de confiance
            voyageant en ferry. Colis légers à 4€/kg, objets volumineux aux enchères.
          </Text>
        </View>

        {/* Trust points */}
        <View style={styles.trust}>
          {TRUST_POINTS.map((point) => (
            <View key={point.icon} style={styles.trustRow}>
              <View style={styles.trustChip}>
                <Ionicons name={point.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.trustTextWrap}>
                <Text style={styles.trustTitle}>{point.title}</Text>
                <Text style={styles.trustText}>{point.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats strip */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>4€/kg</Text>
            <Text style={styles.statLabel}>Colis léger</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Paiement sécurisé</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>FR ⇄ TN</Text>
            <Text style={styles.statLabel}>Par ferry</Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register', { role: 'sender' })}
          >
            <Ionicons name="cube-outline" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>J'envoie un colis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register', { role: 'transporter' })}
          >
            <Ionicons name="car-outline" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Je transporte des colis</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>
              Déjà membre ? <Text style={styles.loginLinkAccent}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Livre blanc */}
        <TouchableOpacity
          style={styles.whitePaperLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('WhitePaper')}
          accessibilityRole="button"
          accessibilityLabel="Découvrir le livre blanc THL"
        >
          <Ionicons name="book-outline" size={18} color={COLORS.primary} />
          <Text style={styles.whitePaperLinkText}>
            Notre vision & feuille de route — Livre blanc THL
          </Text>
          <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.xxl, paddingBottom: SPACING.xxxl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  wordmark: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  wordmarkDot: { color: COLORS.primary },
  loginChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  loginChipText: { color: COLORS.text, fontWeight: '600', fontSize: FONTS.sizes.sm },

  hero: { marginTop: SPACING.xxxl * 1.25 },
  heroTitle: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  heroAccent: { color: COLORS.primary },
  heroSub: {
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.lg,
    lineHeight: 26,
    color: COLORS.textSecondary,
  },

  trust: { marginTop: SPACING.xxxl, gap: SPACING.xl },
  trustRow: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'flex-start' },
  trustChip: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextWrap: { flex: 1 },
  trustTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  trustText: {
    fontSize: FONTS.sizes.md,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  statsCard: {
    marginTop: SPACING.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.md,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.primary },
  statLabel: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.borderLight },

  actions: { marginTop: SPACING.xxxl, gap: SPACING.md },
  primaryButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  primaryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  secondaryButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.lg },
  loginLink: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  loginLinkAccent: { color: COLORS.primary, fontWeight: '700' },

  whitePaperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxxl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.surface,
  },
  whitePaperLinkText: { color: COLORS.primary, fontWeight: '600', fontSize: FONTS.sizes.sm },
});
