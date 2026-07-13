// ──────────────────────────────────────────────────────────────────────────
// THL — ResetPasswordScreen
// Shown when the app is opened from a password-reset e-mail link
// (Supabase PASSWORD_RECOVERY event). Lets the user set a new password.
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
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';

export default function ResetPasswordScreen() {
  const { completePasswordReset, cancelPasswordReset } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const confirmRef = useRef<TextInput>(null);

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await completePasswordReset(password);
      showAlert(
        'Mot de passe modifié',
        'Votre nouveau mot de passe a été enregistré. Vous êtes connecté.'
      );
    } catch (e) {
      showAlert('Modification impossible', getErrorMessage(e));
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
          <View style={styles.iconTile}>
            <Ionicons name="lock-open-outline" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.heading}>Nouveau mot de passe</Text>
          <Text style={styles.subheading}>
            Choisissez un nouveau mot de passe pour votre compte THL.
          </Text>

          <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
          <View style={[styles.inputWrap, error && styles.inputWrapError]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Au moins 6 caractères"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              returnKeyType="next"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error) setError(undefined);
              }}
              onSubmitEditing={() => confirmRef.current?.focus()}
              accessibilityLabel="Nouveau mot de passe"
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

          <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
          <View style={[styles.inputWrap, error && styles.inputWrapError]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
            <TextInput
              ref={confirmRef}
              style={styles.input}
              placeholder="Ressaisissez le mot de passe"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              returnKeyType="go"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                if (error) setError(undefined);
              }}
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Confirmer le mot de passe"
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
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le nouveau mot de passe"
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancel}
            onPress={() => cancelPasswordReset()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Annuler"
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xxl, paddingBottom: SPACING.xxxl, flexGrow: 1, justifyContent: 'center' },

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
  inputWrapError: { borderColor: COLORS.danger },
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

  cancel: { alignSelf: 'center', marginTop: SPACING.xl, minHeight: 32, justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },
});
