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
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, FONTS, DARK, SHADOWS, BEVEL } from '../../utils/theme';
import { useAppNavigation } from '../../navigation/AppNavigator';
import PressableScale from '../../components/PressableScale';

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
      <LinearGradient
        colors={DARK.gradients.base}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero photo — ferry THL */}
        <ImageBackground
          source={require('../../../assets/ferry-hero.png')}
          resizeMode="cover"
          style={styles.hero}
        >
          {/* Voile haut (lisibilité de la barre) */}
          <LinearGradient
            colors={['rgba(5,11,18,0.55)', 'transparent']}
            style={styles.heroTopScrim}
            pointerEvents="none"
          />
          {/* Fondu bas vers le fond sombre */}
          <LinearGradient
            colors={['transparent', 'rgba(10,20,32,0.65)', DARK.colors.bgBase]}
            locations={[0, 0.65, 1]}
            style={styles.heroBottomFade}
            pointerEvents="none"
          />

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

          <View style={styles.heroBadgeWrap}>
            <View style={styles.badge}>
              <Ionicons name="boat-outline" size={14} color={DARK.colors.secondary} />
              <Text style={styles.badgeText}>Trans-Méditerranée · par ferry</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Contenu sombre */}
        <View style={styles.body}>
          <Text style={styles.heroTitle}>
            Vos colis entre la France et la Tunisie,{' '}
            <Text style={styles.heroAccent}>en toute confiance</Text>
          </Text>
          <Text style={styles.heroSub}>
            THL met en relation les expéditeurs avec des transporteurs de confiance
            voyageant en ferry. Colis légers à 4€/kg, objets volumineux aux enchères.
          </Text>

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

  // Corps
  body: { paddingHorizontal: SPACING.xxl, marginTop: -SPACING.sm },
  heroTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: FONTS.family.extrabold,
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
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    ...BEVEL,
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

  trust: { marginTop: SPACING.xxl, gap: SPACING.md },
  trustCard: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
    backgroundColor: DARK.colors.surfaceGlass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DARK.colors.border,
    ...BEVEL,
    ...SHADOWS.raised,
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

  actions: { marginTop: SPACING.xxl, gap: SPACING.md },
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
