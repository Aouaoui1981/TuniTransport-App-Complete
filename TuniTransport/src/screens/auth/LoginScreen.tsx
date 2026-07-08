// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — LoginScreen (STEP 7)
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { supabase, IS_LIVE } from '../../services/supabase';
import { getErrorMessage } from '../../utils/errors';

const DEMO_ACCOUNTS = [
  { icon: 'cube' as const, label: 'Expéditeur démo', email: 'sender@demo.com', color: COLORS.primary },
  { icon: 'car' as const, label: 'Transporteur démo', email: 'transport@demo.com', color: COLORS.secondary },
];

export default function LoginScreen() {
  const navigation = useAppNavigation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(
        'E-mail requis',
        'Saisissez votre adresse e-mail ci-dessus, puis appuyez à nouveau sur « Mot de passe oublié ? ».'
      );
      return;
    }
    if (!IS_LIVE || !supabase) {
      Alert.alert(
        'Mode démo',
        'La réinitialisation du mot de passe n’est pas disponible en mode démo. Connectez-vous avec n’importe quel mot de passe.'
      );
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) throw error;
      Alert.alert(
        'E-mail envoyé',
        `Si un compte existe pour ${trimmed}, un lien de réinitialisation vient d’être envoyé.`
      );
    } catch {
      Alert.alert('Erreur', 'Impossible d’envoyer l’e-mail de réinitialisation. Réessayez.');
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez saisir votre e-mail et votre mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (e) {
      Alert.alert('Connexion impossible', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.heading}>Bienvenue</Text>
          <Text style={styles.subheading}>Connectez-vous à votre compte</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Adresse e-mail"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgot} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, submitting && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.demoBox}>
            <View style={styles.demoHeader}>
              <Ionicons name="flask-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.demoTitle}>Comptes de démonstration</Text>
            </View>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                style={styles.demoRow}
                activeOpacity={0.7}
                onPress={() => {
                  setEmail(acc.email);
                  setPassword('demo123');
                }}
              >
                <View style={[styles.demoIcon, { backgroundColor: `${acc.color}18` }]}>
                  <Ionicons name={acc.icon} size={18} color={acc.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoLabel}>{acc.label}</Text>
                  <Text style={styles.demoEmail}>{acc.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
            <Text style={styles.demoHint}>Mot de passe : demo123</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { role: 'sender' })}>
              <Text style={styles.footerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xxl, paddingBottom: SPACING.xxxl },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },

  heading: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxl,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    height: 52,
  },
  input: { flex: 1, fontSize: FONTS.sizes.lg, color: COLORS.text },

  forgot: { alignSelf: 'flex-end', marginBottom: SPACING.xl },
  forgotText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '600' },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  loginButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textLight, fontSize: FONTS.sizes.sm },

  demoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  demoTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  demoIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  demoEmail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  demoHint: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, textAlign: 'center' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xxl },
  footerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.md },
});
