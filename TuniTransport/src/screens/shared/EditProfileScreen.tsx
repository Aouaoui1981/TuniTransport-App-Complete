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
import * as ImagePicker from 'expo-image-picker';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { IS_LIVE } from '../../services/supabase';
import { uploadAvatar } from '../../services/api';
import { useAppNavigation } from '../../navigation/AppNavigator';

export default function EditProfileScreen() {
  const navigation = useAppNavigation();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatar);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const roleColor = user.role === 'sender' ? COLORS.primary : COLORS.secondary;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permission requise', "Autorisez l'accès pour choisir une photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) setAvatarUri(uri);
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('Champs requis', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      let avatar = avatarUri;
      // Upload only if a new local image was picked (not an already-hosted URL).
      if (avatarUri && avatarUri !== user.avatar && IS_LIVE) {
        avatar = await uploadAvatar(user.id, avatarUri);
      }
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatar,
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
          <TouchableOpacity activeOpacity={0.8} onPress={pickAvatar}>
            <Avatar name={`${firstName} ${lastName}`} size={96} color={roleColor} uri={avatarUri} />
            <View style={[styles.cameraBtn, { backgroundColor: roleColor }]}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar}>
            <Text style={[styles.avatarHint, { color: roleColor }]}>
              {avatarUri ? 'Changer la photo' : 'Ajouter une photo'}
            </Text>
          </TouchableOpacity>
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
  avatarWrap: { alignItems: 'center', marginBottom: SPACING.lg, gap: SPACING.sm },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  avatarHint: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
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
