// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — RegisterScreen (STEP 7)
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
import { showAlert } from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { UserRole } from '../../types';
import { getErrorMessage } from '../../utils/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9 .-]{8,}$/;

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'password';
type FieldErrors = Partial<Record<Field, string>>;

const ROLE_OPTIONS: { role: UserRole; icon: 'cube' | 'car'; label: string; hint: string }[] = [
  { role: 'sender', icon: 'cube', label: 'Expéditeur', hint: "J'envoie des colis" },
  { role: 'transporter', icon: 'car', label: 'Transporteur', hint: 'Je transporte des colis' },
];

export default function RegisterScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Register'>>();
  const { register } = useAuth();

  const [role, setRole] = useState<UserRole>(route.params?.role ?? 'sender');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focused, setFocused] = useState<Field | null>(null);

  const refs = {
    firstName: useRef<TextInput>(null),
    lastName: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    phone: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
  };

  const isSender = role === 'sender';
  const roleColor = isSender ? COLORS.primary : COLORS.secondary;

  const validators: Record<Field, (v: string) => string | undefined> = {
    firstName: (v) => (!v.trim() ? 'Veuillez saisir votre prénom.' : undefined),
    lastName: (v) => (!v.trim() ? 'Veuillez saisir votre nom.' : undefined),
    email: (v) => {
      const t = v.trim();
      if (!t) return 'Veuillez saisir votre adresse e-mail.';
      if (!EMAIL_REGEX.test(t)) return 'Adresse e-mail invalide (ex. nom@exemple.com).';
      return undefined;
    },
    phone: (v) => {
      const t = v.trim();
      if (!t) return 'Veuillez saisir votre numéro de téléphone.';
      if (!PHONE_REGEX.test(t)) return 'Numéro invalide (ex. +33 6 12 34 56 78).';
      return undefined;
    },
    password: (v) => {
      if (!v) return 'Veuillez choisir un mot de passe.';
      if (v.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
      return undefined;
    },
  };

  const values: Record<Field, string> = { firstName, lastName, email, phone, password };

  function setFieldError(field: Field, message: string | undefined) {
    setErrors((e) => ({ ...e, [field]: message }));
  }

  function clearErrorOnChange(field: Field) {
    if (errors[field]) setFieldError(field, undefined);
  }

  async function handleRegister() {
    const nextErrors: FieldErrors = {};
    (Object.keys(validators) as Field[]).forEach((field) => {
      const message = validators[field](values[field]);
      if (message) nextErrors[field] = message;
    });
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(validators) as Field[]).find((f) => nextErrors[f]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        role,
      });
      if (result.emailConfirmationRequired) {
        showAlert(
          'Compte créé !',
          'Vérifiez votre e-mail pour confirmer votre inscription, puis connectez-vous.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (e) {
      showAlert('Inscription impossible', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function fieldStyle(field: Field) {
    return [
      styles.inputWrap,
      focused === field && [styles.inputWrapFocused, { borderColor: roleColor }],
      errors[field] && styles.inputWrapError,
    ];
  }

  function iconColor(field: Field) {
    if (errors[field]) return COLORS.danger;
    if (focused === field) return roleColor;
    return COLORS.textLight;
  }

  function renderError(field: Field) {
    if (!errors[field]) return null;
    return (
      <View style={styles.errorRow} accessibilityLiveRegion="polite">
        <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
        <Text style={styles.errorText}>{errors[field]}</Text>
      </View>
    );
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

          <Text style={styles.heading} accessibilityRole="header">
            Créer un compte
          </Text>
          <Text style={styles.subheading}>Rejoignez THL en quelques secondes</Text>

          <Text style={styles.sectionLabel}>Je m'inscris comme</Text>
          <View style={styles.roleSwitchRow} accessibilityRole="radiogroup">
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.role;
              const c = opt.role === 'sender' ? COLORS.primary : COLORS.secondary;
              return (
                <TouchableOpacity
                  key={opt.role}
                  style={[
                    styles.roleSwitch,
                    active && { backgroundColor: `${c}12`, borderColor: c, borderWidth: 1.5 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setRole(opt.role)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${opt.label} — ${opt.hint}`}
                  accessibilityState={{ selected: active, checked: active }}
                >
                  <Ionicons
                    name={active ? opt.icon : (`${opt.icon}-outline` as const)}
                    size={22}
                    color={active ? c : COLORS.textLight}
                  />
                  <Text style={[styles.roleSwitchText, active && { color: c, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.roleSwitchHint}>{opt.hint}</Text>
                  {active && (
                    <View style={[styles.roleCheck, { backgroundColor: c }]}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <View style={fieldStyle('firstName')}>
                <TextInput
                  ref={refs.firstName}
                  style={styles.input}
                  placeholder="Prénom"
                  placeholderTextColor={COLORS.textLight}
                  autoComplete="given-name"
                  textContentType="givenName"
                  returnKeyType="next"
                  value={firstName}
                  onChangeText={(v) => {
                    setFirstName(v);
                    clearErrorOnChange('firstName');
                  }}
                  onFocus={() => setFocused('firstName')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => refs.lastName.current?.focus()}
                  accessibilityLabel="Prénom"
                />
              </View>
              {renderError('firstName')}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Nom</Text>
              <View style={fieldStyle('lastName')}>
                <TextInput
                  ref={refs.lastName}
                  style={styles.input}
                  placeholder="Nom"
                  placeholderTextColor={COLORS.textLight}
                  autoComplete="family-name"
                  textContentType="familyName"
                  returnKeyType="next"
                  value={lastName}
                  onChangeText={(v) => {
                    setLastName(v);
                    clearErrorOnChange('lastName');
                  }}
                  onFocus={() => setFocused('lastName')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => refs.email.current?.focus()}
                  accessibilityLabel="Nom"
                />
              </View>
              {renderError('lastName')}
            </View>
          </View>

          <Text style={styles.inputLabel}>Adresse e-mail</Text>
          <View style={fieldStyle('email')}>
            <Ionicons name="mail-outline" size={20} color={iconColor('email')} />
            <TextInput
              ref={refs.email}
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
                clearErrorOnChange('email');
              }}
              onFocus={() => setFocused('email')}
              onBlur={() => {
                setFocused(null);
                if (email) setFieldError('email', validators.email(email));
              }}
              onSubmitEditing={() => refs.phone.current?.focus()}
              accessibilityLabel="Adresse e-mail"
            />
          </View>
          {renderError('email')}

          <Text style={styles.inputLabel}>Téléphone</Text>
          <View style={fieldStyle('phone')}>
            <Ionicons name="call-outline" size={20} color={iconColor('phone')} />
            <TextInput
              ref={refs.phone}
              style={styles.input}
              placeholder="+33 6 12 34 56 78 ou +216 20 123 456"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                clearErrorOnChange('phone');
              }}
              onFocus={() => setFocused('phone')}
              onBlur={() => {
                setFocused(null);
                if (phone) setFieldError('phone', validators.phone(phone));
              }}
              onSubmitEditing={() => refs.password.current?.focus()}
              accessibilityLabel="Numéro de téléphone"
            />
          </View>
          {renderError('phone')}

          <Text style={styles.inputLabel}>Mot de passe</Text>
          <View style={fieldStyle('password')}>
            <Ionicons name="lock-closed-outline" size={20} color={iconColor('password')} />
            <TextInput
              ref={refs.password}
              style={styles.input}
              placeholder="Au moins 6 caractères"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearErrorOnChange('password');
              }}
              onFocus={() => setFocused('password')}
              onBlur={() => {
                setFocused(null);
                if (password) setFieldError('password', validators.password(password));
              }}
              onSubmitEditing={handleRegister}
              accessibilityLabel="Mot de passe"
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
          {errors.password ? (
            renderError('password')
          ) : (
            <Text style={styles.helperText}>Au moins 6 caractères.</Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: roleColor },
              submitting && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={`S'inscrire comme ${isSender ? 'expéditeur' : 'transporteur'}`}
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator color={COLORS.white} />
                <Text style={styles.submitButtonText}>Création du compte…</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                S'inscrire comme {isSender ? 'expéditeur' : 'transporteur'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
            >
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.whitePaperLink}
            onPress={() => navigation.navigate('WhitePaper')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Découvrir le livre blanc THL"
          >
            <Ionicons name="book-outline" size={16} color={COLORS.primary} />
            <Text style={styles.whitePaperLinkText}>
              Notre vision & feuille de route — Livre blanc THL
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
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

  heading: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },

  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  roleSwitchRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  roleSwitch: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    minHeight: 92,
  },
  roleSwitchText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  roleSwitchHint: { color: COLORS.textLight, fontSize: FONTS.sizes.xs, textAlign: 'center' },
  roleCheck: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: { flexDirection: 'row', gap: SPACING.md },

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
  helperText: {
    color: COLORS.textLight,
    fontSize: FONTS.sizes.sm,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },

  submitButton: {
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  submitButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.md },

  whitePaperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: `${COLORS.primary}08`,
    alignSelf: 'center',
  },
  whitePaperLinkText: { color: COLORS.primary, fontWeight: '600', fontSize: FONTS.sizes.sm },
});
