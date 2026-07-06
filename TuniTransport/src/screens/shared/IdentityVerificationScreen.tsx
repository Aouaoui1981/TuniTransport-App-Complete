// ──────────────────────────────────────────────────────────────────────────
// TuniTransport -- Vérification d'identité (KYC)
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { IS_LIVE } from '../../services/supabase';
import { uploadIdentityDocument, submitIdentityVerification } from '../../services/api';
import { IdentityStatus } from '../../types';

type DocType = 'cin' | 'passport';

const STATUS_META: Record<
  IdentityStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; title: string }
> = {
  unsubmitted: {
    icon: 'document-outline',
    color: COLORS.textSecondary,
    bg: COLORS.borderLight,
    title: 'Identité non vérifiée',
  },
  pending: {
    icon: 'time-outline',
    color: COLORS.accent,
    bg: COLORS.accentLight,
    title: 'Vérification en cours',
  },
  verified: {
    icon: 'checkmark-circle',
    color: COLORS.success,
    bg: COLORS.secondaryLight,
    title: 'Identité vérifiée',
  },
  rejected: {
    icon: 'close-circle-outline',
    color: COLORS.danger,
    bg: COLORS.dangerLight,
    title: 'Document refusé',
  },
};

export default function IdentityVerificationScreen() {
  const navigation = useAppNavigation();
  const { user, updateUser } = useAuth();

  const [documentType, setDocumentType] = useState<DocType>('cin');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const meta = STATUS_META[user.identityStatus];
  const canResubmit = user.identityStatus !== 'verified';
  const canSubmitForm = !!frontUri && (documentType === 'passport' || !!backUri);

  const captureFrom = async (source: 'camera' | 'library', side: 'front' | 'back') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès pour continuer.");
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    if (side === 'front') setFrontUri(uri);
    else setBackUri(uri);
  };

  const pickImage = (side: 'front' | 'back') => {
    Alert.alert('Ajouter une photo', 'Choisissez une source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Caméra', onPress: () => captureFrom('camera', side) },
      { text: 'Galerie', onPress: () => captureFrom('library', side) },
    ]);
  };

  const submit = async () => {
    if (!IS_LIVE) {
      Alert.alert(
        'Mode démo',
        "La vérification d'identité nécessite une connexion Supabase (mode live)."
      );
      return;
    }
    if (!canSubmitForm || !frontUri) return;

    setSubmitting(true);
    try {
      const front = await uploadIdentityDocument(user.id, 'front', frontUri);
      const back =
        documentType === 'cin'
          ? await uploadIdentityDocument(user.id, 'back', backUri as string)
          : undefined;
      await submitIdentityVerification(user.id, documentType, front, back);

      try {
        await updateUser({ identityStatus: 'pending', identityDocumentType: documentType } as any);
      } catch {}

      Alert.alert(
        'Document envoyé',
        "Votre pièce d'identité a été envoyée. Vous serez notifié une fois la vérification effectuée.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "Impossible d'envoyer le document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Vérification d'identité</Text>

        <View style={[styles.statusCard, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={28} color={meta.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: meta.color }]}>{meta.title}</Text>
            <Text style={styles.statusSubtitle}>
              {user.identityStatus === 'unsubmitted' &&
                "Envoyez une pièce d'identité pour débloquer toutes les fonctionnalités."}
              {user.identityStatus === 'pending' &&
                'Votre document est en cours de vérification par notre équipe.'}
              {user.identityStatus === 'verified' && 'Votre identité a été confirmée. Merci !'}
              {user.identityStatus === 'rejected' &&
                (user.identityRejectionReason || 'Veuillez soumettre un nouveau document.')}
            </Text>
          </View>
        </View>

        {canResubmit && (
          <>
            <Text style={styles.label}>Type de document</Text>
            <View style={styles.typeRow}>
              {(['cin', 'passport'] as DocType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, documentType === type && styles.typeChipActive]}
                  onPress={() => setDocumentType(type)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      documentType === type && styles.typeChipTextActive,
                    ]}
                  >
                    {type === 'cin' ? "Carte d'identité" : 'Passeport'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              {documentType === 'cin' ? 'Recto (devant)' : 'Page photo'}
            </Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('front')}>
              {frontUri ? (
                <Image source={{ uri: frontUri }} style={styles.uploadPreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color={COLORS.textLight} />
                  <Text style={styles.uploadHint}>Ajouter une photo</Text>
                </>
              )}
            </TouchableOpacity>

            {documentType === 'cin' && (
              <>
                <Text style={styles.label}>Verso (derrière)</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('back')}>
                  {backUri ? (
                    <Image source={{ uri: backUri }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={28} color={COLORS.textLight} />
                      <Text style={styles.uploadHint}>Ajouter une photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.submit, (!canSubmitForm || submitting) && { opacity: 0.6 }]}
              onPress={submit}
              disabled={!canSubmitForm || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={COLORS.white} />
                  <Text style={styles.submitText}>Envoyer</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  screenTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statusTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  statusSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.white },
  uploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  uploadPreview: { width: '100%', height: '100%' },
  uploadHint: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: SPACING.xs },
  submit: {
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
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
