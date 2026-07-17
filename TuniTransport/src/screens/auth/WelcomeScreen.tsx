// ──────────────────────────────────────────────────────────────────────────
// THL — WelcomeScreen : accueil « Dark Premium » (thème Méditerranée nuit).
// Fond cinématique en dégradé, lueurs d'ambiance, cartes de verre, bandeau
// stats en dégradé, CTA lumineux à halo. Piloté par les tokens DARK.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, FONTS, DARK } from '../../utils/theme';
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
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Fond cinématique */}
      <LinearGradient
        colors={DARK.gradients.base}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Lueurs d'ambiance */}
      <LinearGradient
        colors={DARK.gradients.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glowTop}
        pointerEvents="none"
      />
      <View style={styles.glowTeal} pointerEvents="none" />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../../assets/logo-mark.png')}
                style={styles.logoMark}
                resizeMode="contain"
              />
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
            <View style={styles.badge}>
              <Ionicons name="boat-outline" size={14} color={DARK.colors.secondary} />
              <Text style={styles.badgeText}>France ⇄ Tunisie · par ferry</Text>
            </View>
            <Text style={styles.heroTitle}>
              Vos colis entre la France et la Tunisie,{' '}
              <Text style={styles.heroAccent}>en toute confiance</Text>
            </Text>
            <Text style={styles.heroSub}>
              THL met en relation les expéditeurs avec des transporteurs de confiance
              voyageant en ferry. Colis légers à 4€/kg, objets volumineux aux enchères.
            </Text>
          </View>

          {/* Stats strip */}
          <LinearGradient
            colors={DARK.gradients.stats}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statCol}>
              <Text style={styles.statValue}>4€/kg</Text>
              <Text style={styles.statLabel}>Colis léger</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Sécurisé</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>FR ⇄ TN</Text>
              <Text style={styles.statLabel}>Par ferry</Text>
            </View>
          </LinearGradient>

          {/* Trust points — cartes de verre */}
          <View style={styles.trust}>
            {TRUST_POINTS.map((point) => (
              <View key={point.icon} style={styles.trustCard}>
                <View style={styles.trustChip}>
                  <Ionicons name={point.icon} size={22} color={DARK.colors.secondary} />
                </View>
                <View style={styles.trustTextWrap}>
                  <Text style={styles.trustTitle}>{point.title}</Text>
                  <Text style={styles.trustText}>{point.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryButtonWrap}
              onPress={() => navigation.navigate('Register', { role: 'sender' })}
            >
              <LinearGradient
                colors={DARK.gradients.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Ionicons name="cube-outline" size={20} color={DARK.colors.white} />
                <Text style={styles.primaryButtonText}>J'envoie un colis</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Register', { role: 'transporter' })}
            >
              <Ionicons name="car-outline" size={20} color={DARK.colors.text} />
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
            <Ionicons name="book-outline" size={18} color={DARK.colors.secondary} />
            <Text style={styles.whitePaperLinkText}>
              Notre vision & feuille de route — Livre blanc THL
            </Text>
            <Ionicons name="chevron-forward" size={15} color={DARK.colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.colors.bgBase },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.xxl, paddingBottom: SPACING.xxxl },

  // Lueurs d'ambiance
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 380,
  },
  glowTeal: {
    position: 'absolute',
    top: 180,
    right: -140,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: DARK.colors.glowTeal,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  logoMark: { width: 46, height: 46 },
  wordmark: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: DARK.colors.text,
    letterSpacing: -0.5,
  },
  wordmarkDot: { color: DARK.colors.secondary },
  loginChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: DARK.colors.borderStrong,
    backgroundColor: DARK.colors.surfaceGlass,
  },
  loginChipText: { color: DARK.colors.text, fontWeight: '600', fontSize: FONTS.sizes.sm },

  hero: { marginTop: SPACING.xxxl },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: DARK.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  badgeText: { color: DARK.colors.secondary, fontWeight: '700', fontSize: FONTS.sizes.xs },
  heroTitle: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    color: DARK.colors.text,
    letterSpacing: -1,
  },
  heroAccent: { color: DARK.colors.secondary },
  heroSub: {
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.lg,
    lineHeight: 26,
    color: DARK.colors.textSecondary,
  },

  statsCard: {
    marginTop: SPACING.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    ...DARK.shadows.card,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: DARK.colors.white },
  statLabel: {
    marginTop: 3,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.15)' },

  trust: { marginTop: SPACING.xxxl, gap: SPACING.md },
  trustCard: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
    backgroundColor: DARK.colors.surfaceGlass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    padding: SPACING.lg,
  },
  trustChip: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextWrap: { flex: 1 },
  trustTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: DARK.colors.text,
    marginBottom: 2,
  },
  trustText: {
    fontSize: FONTS.sizes.md,
    lineHeight: 21,
    color: DARK.colors.textSecondary,
  },

  actions: { marginTop: SPACING.xxxl, gap: SPACING.md },
  primaryButtonWrap: {
    borderRadius: RADIUS.lg,
    ...DARK.shadows.glowPrimary,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: DARK.colors.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  secondaryButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: DARK.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: DARK.colors.borderStrong,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: DARK.colors.text, fontWeight: '700', fontSize: FONTS.sizes.lg },
  loginLink: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: DARK.colors.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  loginLinkAccent: { color: DARK.colors.secondary, fontWeight: '700' },

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
    borderColor: DARK.colors.border,
    backgroundColor: DARK.colors.surfaceGlass,
  },
  whitePaperLinkText: { color: DARK.colors.text, fontWeight: '600', fontSize: FONTS.sizes.sm },
});
