// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — WelcomeScreen (STEP 7)
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAppNavigation } from '../../navigation/AppNavigator';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'cube-outline', label: 'Envoyez vos colis en toute sécurité' },
  { icon: 'car-outline', label: 'Transporteurs vérifiés et fiables' },
  { icon: 'location-outline', label: 'Suivi en temps réel de vos envois' },
];

export default function WelcomeScreen() {
  const navigation = useAppNavigation();

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark, '#1E3A8A']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="boat" size={44} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>TuniTransport</Text>
          <Text style={styles.tagline}>Connectez la France à la Tunisie</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={COLORS.white} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register', { role: 'sender' })}
          >
            <Ionicons name="cube-outline" size={18} color={COLORS.white} />
            <Text style={styles.outlineButtonText}>S'inscrire comme Expéditeur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register', { role: 'transporter' })}
          >
            <Ionicons name="car-outline" size={18} color={COLORS.white} />
            <Text style={styles.outlineButtonText}>S'inscrire comme Transporteur</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: SPACING.xxl, justifyContent: 'space-between' },

  hero: { alignItems: 'center', marginTop: SPACING.xxxl * 1.5 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  title: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.white },
  tagline: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.primaryLight,
    marginTop: SPACING.sm,
  },

  features: { gap: SPACING.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: COLORS.white, fontSize: FONTS.sizes.lg, flex: 1 },

  actions: { gap: SPACING.md, marginBottom: SPACING.xxl },
  primaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  primaryButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.lg },
  outlineButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sizes.lg },
});
