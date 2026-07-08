// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Modifier le profil
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';

export default function EditProfileScreen() {
  const navigation = useAppNavigation();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Champs requis', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      showAlert('Profil mis à jour', 'Vos informations ont été enregistrées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible d’enregistrer les modifications.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <Avatar
            name={`${firstName} ${lastName}`}
            size={84}
            color={user.role === 'sender' ? COLORS.primary : COLORS.secondary}
          />
        </View>

        <Text style={styles.label}>Prénom</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prénom"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <Text style={styles.label}>Nom</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nom"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <Text style={styles.label}>Téléphone</Text>
        <View style={styles.inputRow}>
          <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+33 6 12 34 56 78"
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>E-mail</Text>
        <View style={[styles.inputRow, styles.inputRowDisabled]}>
          <Ionicons name="mail-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.inputDisabled}>{user.email}</Text>
          <Ionicons name="lock-closed-outline" size={14} color={COLORS.textLight} />
        </View>
        <Text style={styles.hint}>L’adresse e-mail ne peut pas être modifiée.</Text>

        <TouchableOpacity
          style={[styles.save, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />
          <Text style={styles.saveText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  avatarWrap: { alignItems: 'center', marginBottom: SPACING.lg },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  inputRowDisabled: { backgroundColor: COLORS.borderLight },
  input: { flex: 1, paddingVertical: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.text },
  inputDisabled: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: SPACING.xs },
  save: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  saveText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
