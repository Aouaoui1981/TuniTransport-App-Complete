// ──────────────────────────────────────────────────────────────────────────
// THL — WelcomeScreen : accueil « Dark Premium » avec hero photo (ferry THL).
// Image plein cadre en haut qui se fond dans le fond sombre, puis contenu
// (titre, stats, cartes de verre, CTA lumineux). Piloté par les tokens DARK.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, FONTS, DARK } from '../../utils/theme';
import { useAppNavigation } from '../../navigation/AppNavigator';
import PressableScale from '../../components/PressableScale';
import OnboardingOverlay from '../../components/OnboardingOverlay';

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
      <OnboardingOverlay />
      <StatusBar style="light" />

      {/* Fond dégradé aux couleurs de la marque (fixe) — pas d'image */}
      <LinearGradient
        colors={['#0F3B3A', '#0E2233', '#0A1420', '#050B12']}
        locations={[0, 0.32, 0.7, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Lueur teal douce en haut pour une touche premium */}
      <LinearGradient
        colors={['rgba(45,212,191,0.16)', 'rgba(45,212,191,0)']}
        locations={[0, 1]}
        style={styles.glow}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* En-tête transparent au-dessus de l'image fixe */}
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              {/* Le logo contient déjà « THL » — pas de texte redondant. */}
              <Image
                source={require('../../../assets/logo-mark.png')}
                style={styles.logoMark}
                resizeMode="contain"
                accessibilityLabel="THL"
              />
            </View>
            <TouchableOpacity
              style={styles.loginChip}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginChipText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Espace laissant voir l'image de fond, avec le badge */}
        <View style={styles.heroSpacer}>
          <View style={styles.badge}>
            <Ionicons name="boat-outline" size={14} color={DARK.colors.secondary} />
            <Text style={styles.badgeText}>Trans-Méditerranée · par ferry</Text>
          </View>
        </View>

        {/* Contenu */}
        <View style={styles.body}>
          <Text style={styles.heroTitle}>
            Vos colis entre la France et la Tunisie,{' '}
            <Text style={styles.heroAccent}>en toute confiance</Text>
          </Text>
          <Text style={styles.heroSub}>
            Expédiez avec des transporteurs vérifiés voyageant en ferry. Colis légers dès 4€/kg.
          </Text>

          {/* Points de confiance — rangée compacte */}
          <View style={styles.trustRow}>
            {TRUST_POINTS.map((point) => (
              <View key={point.icon} style={styles.trustItem}>
                <View style={styles.trustChip}>
                  <Ionicons name={point.icon} size={20} color={DARK.colors.secondary} />
                </View>
                <Text style={styles.trustItemLabel}>{point.title}</Text>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={styles.actions}>
            <PressableScale
              style={styles.primaryButtonWrap}
              onPress={() => navigation.navigate('Register', { role: 'sender' })}
              accessibilityRole="button"
              accessibilityLabel="J'envoie un colis"
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
            </PressableScale>

            <PressableScale
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Register', { role: 'transporter' })}
              accessibilityRole="button"
              accessibilityLabel="Je transporte des colis"
            >
              <Ionicons name="car-outline" size={20} color={DARK.colors.secondary} />
              <Text style={styles.secondaryButtonText}>Je transporte des colis</Text>
            </PressableScale>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>
                Déjà membre ? <Text style={styles.loginLinkAccent}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Offre de parrainage */}
          <View style={styles.referral}>
            <View style={styles.referralBadge}>
              <Text style={styles.referralBadgeText}>OFFRE DE LANCEMENT</Text>
            </View>
            <View style={styles.referralBody}>
              <View style={styles.referralIcon}>
                <Ionicons name="gift" size={26} color={DARK.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.referralTitle}>
                  Parrainez et gagnez <Text style={styles.referralAmount}>10 €</Text>
                </Text>
                <Text style={styles.referralText}>
                  10 € offerts pour chaque expéditeur ou transporteur que vous invitez, dès
                  sa première opération sur THL.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.colors.bgBase },
  scroll: { paddingBottom: SPACING.xxxl },

  // Hero photo
  hero: { width: '100%', height: 360, justifyContent: 'space-between' },
  heroTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  heroBottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 190 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  logoMark: { width: 52, height: 52 },
  wordmark: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.family.extrabold,
    color: DARK.colors.white,
    letterSpacing: -0.5,
  },
  wordmarkDot: { color: DARK.colors.secondary },
  loginChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(5,11,18,0.35)',
  },
  loginChipText: { color: DARK.colors.white, fontWeight: '600', fontSize: FONTS.sizes.sm },

  heroBadgeWrap: { paddingHorizontal: SPACING.xxl, paddingBottom: SPACING.xl },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(5,11,18,0.55)',
    borderWidth: 1,
    borderColor: DARK.colors.borderStrong,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  badgeText: { color: DARK.colors.white, fontWeight: '700', fontSize: FONTS.sizes.xs },

  // Lueur teal en haut de l'écran
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },

  // Badge sous la barre supérieure
  heroSpacer: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xs,
  },

  // Corps
  body: { paddingHorizontal: SPACING.xxl, marginTop: SPACING.xs },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: FONTS.family.extrabold,
    color: DARK.colors.text,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  heroAccent: { color: DARK.colors.secondary },
  heroSub: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    lineHeight: 21,
    color: DARK.colors.textSecondary,
  },

  trustRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: DARK.colors.surfaceGlass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  trustChip: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustItemLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: DARK.colors.text,
    textAlign: 'center',
  },

  actions: { marginTop: SPACING.xl, gap: SPACING.md },
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
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(45,212,191,0.55)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: DARK.colors.secondary, fontWeight: '700', fontSize: FONTS.sizes.lg },
  loginLink: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: DARK.colors.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  loginLinkAccent: { color: DARK.colors.secondary, fontWeight: '700' },

  referral: {
    marginTop: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,179,66,0.35)',
    backgroundColor: 'rgba(245,179,66,0.06)',
    padding: SPACING.lg,
  },
  referralBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,179,66,0.16)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    marginBottom: SPACING.md,
  },
  referralBadgeText: {
    color: DARK.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  referralBody: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  referralIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(245,179,66,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,179,66,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: DARK.colors.text,
    marginBottom: 3,
  },
  referralAmount: { color: DARK.colors.accent },
  referralText: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 19,
    color: DARK.colors.textSecondary,
  },
});
