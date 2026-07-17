// ──────────────────────────────────────────────────────────────────────────
// THL — CompleteProfileScreen
// Affiché après une connexion sociale (Google / Apple / Facebook) tant que le
// compte n'a pas choisi son rôle ni complété ses informations. Prend le relais
// de la navigation jusqu'à ce que le profil soit complet.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const PHONE_REGEX = /^\+?[0-9 .-]{8,}$/;

const ROLE_OPTIONS: { role: UserRole; icon: 'cube' | 'car'; label: string; hint: string }[] = [
  { role: 'sender', icon: 'cube', label: 'Expéditeur', hint: "J'envoie un colis" },
  { role: 'transporter', icon: 'car', label: 'Transporteur', hint: 'Je transporte des colis' },
];

export default function CompleteProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [role, setRole] = useState<UserRole>(user?.role ?? 'sender');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [submitting, setSubmitting] = useState(false);

  const roleColor = role === 'sender' ? COLORS.primary : COLORS.secondary;

  async function handleSubmit() {
    if (!firstName.trim()) {
      showAlert('Prénom requis', 'Veuillez saisir votre prénom.');
      return;
    }
    if (!lastName.trim()) {
      showAlert('Nom requis', 'Veuillez saisir votre nom.');
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      showAlert('Téléphone invalide', 'Veuillez saisir un numéro valide (ex. +33 6 12 34 56 78).');
      return;
    }
    setSubmitting(true);
    try {
      await updateUser({
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        onboarded: true,
      });
    } catch (e) {
      showAlert('Enregistrement impossible', getErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Bienvenue sur THL !</Text>
          <Text style={styles.subheading}>Complétez votre profil pour commencer.</Text>

          <Text style={styles.sectionLabel}>Je m'inscris comme</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.role;
              const c = opt.role === 'sender' ? COLORS.primary : COLORS.secondary;
              return (
                <TouchableOpacity
                  key={opt.role}
                  style={[styles.roleCard, active && { backgroundColor: `${c}12`, borderColor: c, borderWidth: 1.5 }]}
                  activeOpacity={0.7}
                  onPress={() => setRole(opt.role)}
                >
                  <Ionicons
                    name={active ? opt.icon : (`${opt.icon}-outline` as const)}
                    size={22}
                    color={active ? c : COLORS.textLight}
                  />
                  <Text style={[styles.roleLabel, active && { color: c, fontWeight: '700' }]}>{opt.label}</Text>
                  <Text style={styles.roleHint}>{opt.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Prénom"
                  placeholderTextColor={COLORS.textLight}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Nom</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Nom"
                  placeholderTextColor={COLORS.textLight}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          <Text style={styles.inputLabel}>Téléphone</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="+33 6 12 34 56 78 ou +216 20 123 456"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <TouchableOpacity
            style={[styles.submit, { backgroundColor: roleColor }, submitting && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Continuer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={() => logout()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>Se déconnecter</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xxl, paddingBottom: SPACING.xxxl, flexGrow: 1, justifyContent: 'center' },

  heading: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text },
  subheading: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xl },

  sectionLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  roleRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  roleCard: {
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
  roleLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  roleHint: { color: COLORS.textLight, fontSize: FONTS.sizes.xs, textAlign: 'center' },

  row: { flexDirection: 'row', gap: SPACING.md },
  inputLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
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
  input: { flex: 1, fontSize: FONTS.sizes.lg, color: COLORS.text },

  submit: {
    borderRadius: RADIUS.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  cancel: { alignSelf: 'center', marginTop: SPACING.lg, minHeight: 32, justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },
});
