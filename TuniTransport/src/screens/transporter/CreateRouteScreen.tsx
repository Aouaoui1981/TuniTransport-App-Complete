// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Créer un trajet (transporteur) — STEP 9
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/AppNavigator';

const FERRY_COMPANIES = ['Corsica Linea', 'CTN', 'GNV'] as const;
const CROSSING_DAYS = 1; // typical France → Tunisia ferry crossing

export default function CreateRouteScreen() {
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { addRoute } = useData();

  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [company, setCompany] = useState<(typeof FERRY_COMPANIES)[number]>('CTN');
  const [capacity, setCapacity] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [saving, setSaving] = useState(false);

  const parseDate = (value: string): Date | null => {
    // Accepts JJ/MM/AAAA
    const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 18, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const submit = async () => {
    if (!user) return;
    const kg = parseInt(capacity, 10);
    const dep = parseDate(departureDate);
    if (!departureCity.trim() || !arrivalCity.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner les villes de départ et d’arrivée.');
      return;
    }
    if (!kg || kg <= 0) {
      Alert.alert('Capacité invalide', 'Veuillez saisir une capacité en kg.');
      return;
    }
    if (!dep) {
      Alert.alert('Date invalide', 'Format attendu : JJ/MM/AAAA.');
      return;
    }
    const arr = new Date(dep);
    arr.setDate(arr.getDate() + CROSSING_DAYS);

    setSaving(true);
    try {
      await addRoute({
        transporterId: user.id,
        departureCity: departureCity.trim(),
        departureCountry: 'France',
        arrivalCity: arrivalCity.trim(),
        arrivalCountry: 'Tunisie',
        departureDate: dep.toISOString(),
        estimatedArrivalDate: arr.toISOString(),
        availableCapacity: kg,
        ferryCompany: company,
      });
      Alert.alert('Trajet ajouté', 'Votre trajet est maintenant visible.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d’ajouter le trajet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Nouveau trajet</Text>
        <Text style={styles.subheading}>
          Publiez votre traversée pour recevoir des demandes de transport.
        </Text>

        {/* Departure */}
        <Text style={styles.label}>Ville de départ (France)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <TextInput
            style={styles.input}
            value={departureCity}
            onChangeText={setDepartureCity}
            placeholder="Ex : Marseille"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Arrival */}
        <Text style={styles.label}>Ville d’arrivée (Tunisie)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="location" size={18} color={COLORS.secondary} />
          <TextInput
            style={styles.input}
            value={arrivalCity}
            onChangeText={setArrivalCity}
            placeholder="Ex : Tunis"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Ferry company */}
        <Text style={styles.label}>Compagnie maritime</Text>
        <View style={styles.companyRow}>
          {FERRY_COMPANIES.map((c) => {
            const active = company === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.companyChip, active && styles.companyChipActive]}
                onPress={() => setCompany(c)}
              >
                <Ionicons
                  name="boat"
                  size={14}
                  color={active ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.companyText, active && styles.companyTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Capacity */}
        <Text style={styles.label}>Capacité disponible (kg)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="scale-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="Ex : 150"
            placeholderTextColor={COLORS.textLight}
            keyboardType="number-pad"
          />
        </View>

        {/* Departure date */}
        <Text style={styles.label}>Date de départ</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            value={departureDate}
            onChangeText={setDepartureDate}
            placeholder="JJ/MM/AAAA"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <TouchableOpacity
          style={[styles.submit, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          <Ionicons name="add-circle" size={18} color={COLORS.white} />
          <Text style={styles.submitText}>{saving ? 'Publication…' : 'Publier le trajet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  heading: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subheading: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
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
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  companyRow: { flexDirection: 'row', gap: SPACING.sm },
  companyChip: {
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
  companyChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  companyText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  companyTextActive: { color: COLORS.white },
  submit: {
    marginTop: SPACING.xxl,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
