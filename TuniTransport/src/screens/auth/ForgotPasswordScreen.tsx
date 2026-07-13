// ──────────────────────────────────────────────────────────────────────────
// THL — ForgotPasswordScreen
// Dedicated screen to request a password-reset e-mail. The user enters the
// e-mail they registered with and receives a link to set a new password.
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { supabase, IS_LIVE } from '../../services/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ForgotPassword'>>();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailRef = useRef<TextInput>(null);

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Veuillez saisir votre adresse e-mail.');
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Adresse e-mail invalide (ex. nom@exemple.com).');
      return;
    }
    setError(undefined);

    if (!IS_LIVE || !supabase) {
      setSent(true);
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error: reqError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        redirectTo ? { redirectTo } : undefined
      );
      if (reqError) throw reqError;
      setSent(true);
    } catch {
      // Do not reveal whether the account exists — always show a neutral state.
      setSent(true);
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
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          {sent ? (
            <View style={styles.sentBox}>
              <View style={styles.sentIcon}>
                <Ionicons name="mail-open-outline" size={30} color={COLORS.primary} />
              </View>
              <Text style={[styles.heading, styles.center]}>Vérifiez votre e-mail</Text>
              <Text style={[styles.subheading, styles.center]}>
                Si un compte existe pour {email.trim()}, un lien de réinitialisation vient d'être
                envoyé. Ouvrez-le pour choisir un nouveau mot de passe.
              </Text>
              <TouchableOpacity
                style={[styles.submitButton, styles.sentButton]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Login')}
                accessibilityRole="button"
                accessibilityLabel="Retour à la connexion"
              >
                <Text style={styles.submitButtonText}>Retour à la connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resend}
                onPress={() => setSent(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resendText}>Renvoyer le lien</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.iconTile}>
                <Ionicons name="key-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.heading}>Mot de passe oublié ?</Text>
              <Text style={styles.subheading}>
                Saisissez l'adresse e-mail de votre compte. Nous vous enverrons un lien pour créer
                un nouveau mot de passe.
              </Text>

              <Text style={styles.inputLabel}>Adresse e-mail</Text>
              <View
                style={[
                  styles.inputWrap,
                  focused && styles.inputWrapFocused,
                  error && styles.inputWrapError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={error ? COLORS.danger : focused ? COLORS.primary : COLORS.textLight}
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
                  returnKeyType="send"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (error) setError(undefined);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={handleSend}
                  accessibilityLabel="Adresse e-mail"
                />
              </View>
              {error ? (
                <View style={styles.errorRow} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleSend}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le lien de réinitialisation"
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Envoyer le lien</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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

  iconTile: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heading: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
    lineHeight: 22,
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
  inputWrapFocused: { borderColor: COLORS.primary, ...SHADOWS.sm },
  inputWrapError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  input: { flex: 1, fontSize: FONTS.sizes.lg, color: COLORS.text },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: FONTS.sizes.sm },

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },

  center: { textAlign: 'center' },
  sentBox: { alignItems: 'center', marginTop: SPACING.xxl },
  sentButton: { alignSelf: 'stretch' },
  sentIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  resend: { marginTop: SPACING.lg, minHeight: 32, justifyContent: 'center' },
  resendText: { color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: '600' },
});
