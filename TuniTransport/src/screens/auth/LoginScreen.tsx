// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — LoginScreen (STEP 7)
// ──────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { getErrorMessage } from '../../utils/errors';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import PressableScale from '../../components/PressableScale';

const DEMO_ACCOUNTS = [
  { icon: 'cube' as const, label: 'Expéditeur démo', email: 'sender@demo.com', color: COLORS.primary },
  { icon: 'car' as const, label: 'Transporteur démo', email: 'transport@demo.com', color: COLORS.secondary },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

export default function LoginScreen() {
  const navigation = useAppNavigation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  function validateEmail(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return 'Veuillez saisir votre adresse e-mail.';
    if (!EMAIL_REGEX.test(trimmed)) return 'Adresse e-mail invalide (ex. nom@exemple.com).';
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value) return 'Veuillez saisir votre mot de passe.';
    return undefined;
  }

  function handleForgotPassword() {
    // Open the dedicated screen, pre-filling the e-mail already typed (if any).
    navigation.navigate('ForgotPassword', { email: email.trim() || undefined });
  }

  async function handleLogin() {
    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (e) {
      showAlert('Connexion impossible', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const emailInvalid = Boolean(errors.email);
  const passwordInvalid = Boolean(errors.password);

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
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <View style={styles.logoTile}>
              <Ionicons name="boat" size={26} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.heading} accessibilityRole="header">
                Bienvenue
              </Text>
              <Text style={styles.subheading}>Connectez-vous à votre compte</Text>
            </View>
          </View>

          <Text style={styles.inputLabel} nativeID="email-label">
            Adresse e-mail
          </Text>
          <View
            style={[
              styles.inputWrap,
              focused === 'email' && styles.inputWrapFocused,
              emailInvalid && styles.inputWrapError,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={emailInvalid ? COLORS.danger : focused === 'email' ? COLORS.primary : COLORS.textLight}
            />
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="nom@exemple.com"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              onFocus={() => setFocused('email')}
              onBlur={() => {
                setFocused(null);
                if (email) setErrors((e) => ({ ...e, email: validateEmail(email) }));
              }}
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Adresse e-mail"
              accessibilityLabelledBy="email-label"
            />
          </View>
          {emailInvalid && (
            <View style={styles.errorRow} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}

          <Text style={styles.inputLabel} nativeID="password-label">
            Mot de passe
          </Text>
          <View
            style={[
              styles.inputWrap,
              focused === 'password' && styles.inputWrapFocused,
              passwordInvalid && styles.inputWrapError,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={
                passwordInvalid ? COLORS.danger : focused === 'password' ? COLORS.primary : COLORS.textLight
              }
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Votre mot de passe"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={handleLogin}
              accessibilityLabel="Mot de passe"
              accessibilityLabelledBy="password-label"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>
          {passwordInvalid && (
            <View style={styles.errorRow} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.forgot}
            onPress={handleForgotPassword}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Mot de passe oublié"
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <PressableScale
            style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <View style={styles.loginButtonContent}>
                <ActivityIndicator color={COLORS.white} />
                <Text style={styles.loginButtonText}>Connexion…</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </PressableScale>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialAuthButtons />

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
                  setErrors({});
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remplir avec le compte ${acc.label}`}
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
            <TouchableOpacity
              onPress={() => navigation.navigate('Register', { role: 'sender' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="S'inscrire"
            >
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  inputWrapError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  input: { flex: 1, fontSize: FONTS.sizes.lg, color: COLORS.text },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: FONTS.sizes.sm },

  forgot: { alignSelf: 'flex-end', marginBottom: SPACING.xl, minHeight: 32, justifyContent: 'center' },
  forgotText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '600' },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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
    marginTop: SPACING.xl,
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
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44 },
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

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.md },
});
