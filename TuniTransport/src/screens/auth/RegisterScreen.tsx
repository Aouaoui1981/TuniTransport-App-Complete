// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — RegisterScreen (STEP 7)
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
import { useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { UserRole } from '../../types';
import { getErrorMessage } from '../../utils/errors';

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

  const isSender = role === 'sender';
  const roleColor = isSender ? COLORS.primary : COLORS.secondary;

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Au moins 6 caractères sont requis.');
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
        Alert.alert(
          'Compte créé !',
          'Vérifiez votre e-mail pour confirmer votre inscription, puis connectez-vous.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (e) {
      Alert.alert('Inscription impossible', getErrorMessage(e));
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

          <Text style={styles.heading}>Créer un compte</Text>

          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15`, borderColor: roleColor }]}>
            <Ionicons name={isSender ? 'cube' : 'car'} size={16} color={roleColor} />
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
              {isSender ? 'Expéditeur' : 'Transporteur'}
            </Text>
          </View>

          <View style={styles.roleSwitchRow}>
            {(['sender', 'transporter'] as UserRole[]).map((r) => {
              const active = role === r;
              const c = r === 'sender' ? COLORS.primary : COLORS.secondary;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleSwitch,
                    active && { backgroundColor: `${c}15`, borderColor: c },
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleSwitchText, active && { color: c, fontWeight: '700' }]}>
                    {r === 'sender' ? 'Expéditeur' : 'Transporteur'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor={COLORS.textLight}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Nom"
                placeholderTextColor={COLORS.textLight}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

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
            <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Téléphone (+33 / +216)"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
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

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: roleColor }, submitting && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
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

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  roleBadgeText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  roleSwitchRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  roleSwitch: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  roleSwitchText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },

  row: { flexDirection: 'row', gap: SPACING.md },

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

  submitButton: {
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  submitButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xxl },
  footerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sizes.md },
});
