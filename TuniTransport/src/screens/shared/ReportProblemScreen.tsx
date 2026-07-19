// ──────────────────────────────────────────────────────────────────────────
// THL — Signaler un problème sur un envoi (litige)
// L'expéditeur ou le transporteur de l'envoi décrit le problème ; il est
// ensuite traité par l'équipe (Profil → Mes signalements pour le suivi).
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { createDispute } from '../../services/api';
import { DisputeCategory } from '../../types';

const CATEGORIES: { key: DisputeCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'lost', label: 'Colis perdu', icon: 'help-buoy-outline' },
  { key: 'damaged', label: 'Colis endommagé', icon: 'alert-circle-outline' },
  { key: 'delay', label: 'Retard important', icon: 'time-outline' },
  { key: 'not_as_described', label: 'Non conforme', icon: 'documents-outline' },
  { key: 'no_show', label: 'Rendez-vous manqué', icon: 'person-remove-outline' },
  { key: 'other', label: 'Autre', icon: 'ellipsis-horizontal' },
];

export default function ReportProblemScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ReportProblem'>>();
  const { shipmentId } = route.params;

  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!category) {
      showAlert('Type de problème', 'Veuillez choisir le type de problème.');
      return;
    }
    if (description.trim().length < 10) {
      showAlert('Description', 'Décrivez le problème en quelques mots (au moins 10 caractères).');
      return;
    }
    setSubmitting(true);
    try {
      await createDispute(shipmentId, category, description.trim());
      showAlert(
        'Signalement envoyé',
        "Votre signalement a bien été transmis à notre équipe. Vous pouvez suivre son traitement dans Profil → Mes signalements. Nous vous répondrons sous 24 h ouvrées.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, "Impossible d'envoyer le signalement."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Signaler un problème</Text>
        <Text style={styles.subtitle}>
          Un souci avec cet envoi (perte, dommage, retard…) ? Décrivez-le : notre équipe
          examine l'historique et intervient pour vous aider.
        </Text>

        <Text style={styles.label}>Type de problème</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={c.icon}
                  size={18}
                  color={active ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Expliquez ce qui s'est passé (date, état du colis, échanges avec l'autre partie…)"
          placeholderTextColor={COLORS.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.tipText}>
            Conseil : contactez d'abord l'autre partie via la messagerie. Si le désaccord
            persiste, ce signalement nous permet de trancher à partir de l'historique.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submit, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={COLORS.white} />
              <Text style={styles.submitText}>Envoyer le signalement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 21,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  catText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  catTextActive: { color: COLORS.white },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  tip: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },
  tipText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  submit: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
