// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Évaluer le transporteur — STEP 10 + STEP 11 rating rule
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { Avatar } from '../../components';
import { useData } from '../../context/DataContext';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';

const QUICK_TAGS = ['Ponctuel', 'Communicatif', 'Soigneux', 'Professionnel', 'Recommandé'];

export default function RateUserScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'RateUser'>>();
  const { getShipmentById, submitRating } = useData();

  const shipment = getShipmentById(route.params.shipmentId);

  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!shipment || !shipment.transporterId || !shipment.transporterName) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Aucun transporteur à évaluer.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    if (stars === 0) {
      Alert.alert('Note requise', 'Veuillez sélectionner un nombre d’étoiles.');
      return;
    }
    setSaving(true);
    try {
      await submitRating({
        shipmentId: shipment.id,
        ratedUserId: shipment.transporterId!,
        stars,
        tags: tags.length ? tags : undefined,
        comment: comment.trim() || undefined,
      });
      Alert.alert('Merci !', 'Votre évaluation a bien été enregistrée.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d’enregistrer l’évaluation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Transporter identity */}
        <View style={styles.identity}>
          <Avatar name={shipment.transporterName} size={80} color={COLORS.secondary} />
          <Text style={styles.name}>{shipment.transporterName}</Text>
          <Text style={styles.route}>
            {shipment.pickupAddress.city} → {shipment.deliveryAddress.city}
          </Text>
        </View>

        {/* Stars */}
        <Text style={styles.question}>Comment évaluez-vous ce transporteur ?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setStars(n)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
              <Ionicons
                name={n <= stars ? 'star' : 'star-outline'}
                size={42}
                color={COLORS.accent}
              />
            </TouchableOpacity>
          ))}
        </View>
        {stars > 0 ? (
          <Text style={styles.starsLabel}>
            {['Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'][stars - 1]}
          </Text>
        ) : null}

        {/* Quick tags */}
        <View style={styles.tagsWrap}>
          {QUICK_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, active && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comment */}
        <Text style={styles.label}>Commentaire (optionnel)</Text>
        <TextInput
          style={styles.comment}
          value={comment}
          onChangeText={setComment}
          placeholder="Partagez votre expérience…"
          placeholderTextColor={COLORS.textLight}
          multiline
        />

        <TouchableOpacity
          style={[styles.submit, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          <Ionicons name="star" size={18} color={COLORS.white} />
          <Text style={styles.submitText}>
            {saving ? 'Envoi…' : 'Envoyer l’évaluation'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  identity: { alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xl },
  name: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
  route: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  question: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  starsLabel: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.accent,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  tag: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  tagText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  tagTextActive: { color: COLORS.accent, fontWeight: '800' },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xs,
  },
  comment: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  submit: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
