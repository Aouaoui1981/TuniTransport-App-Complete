// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — CreateShipmentScreen (STEP 8)
// small: live price = weight × 4€/kg  ·  large: auction (bids)
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { coordsFor } from '../../services/mockData';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { IS_LIVE } from '../../services/supabase';
import { ShipmentType } from '../../types';

const PRICE_PER_KG = 4;

export default function CreateShipmentScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateShipment'>>();
  const { user } = useAuth();
  const { addShipment } = useData();

  const [type, setType] = useState<ShipmentType>(route.params?.type ?? 'small');
  // Route
  const [pickupCity, setPickupCity] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  // Small parcel
  const [weight, setWeight] = useState('');
  // Large item
  const [description, setDescription] = useState('');
  const [dimensions, setDimensions] = useState('');
  // Addresses
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupContact, setPickupContact] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const isSmall = type === 'small';
  const weightNum = parseFloat(weight.replace(',', '.')) || 0;
  const livePrice = useMemo(() => Math.round(weightNum * PRICE_PER_KG * 100) / 100, [weightNum]);

  async function handlePublish() {
    // Live mode requires a verified identity (enforced by RLS): guide the
    // user to the KYC screen instead of letting the insert fail server-side.
    if (IS_LIVE && user?.identityStatus !== 'verified') {
      Alert.alert(
        'Vérification requise',
        "Vous devez faire vérifier votre identité avant de publier un envoi.",
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Vérifier mon identité', onPress: () => navigation.navigate('IdentityVerification') },
        ]
      );
      return;
    }
    if (!pickupCity.trim() || !deliveryCity.trim()) {
      Alert.alert('Champs requis', 'Indiquez la ville de collecte et la ville de livraison.');
      return;
    }
    if (isSmall && weightNum <= 0) {
      Alert.alert('Poids requis', 'Indiquez le poids total de votre colis en kg.');
      return;
    }
    if (!isSmall && !description.trim()) {
      Alert.alert('Description requise', "Décrivez l'objet à transporter.");
      return;
    }
    if (!pickupStreet.trim() || !pickupContact.trim() || !pickupPhone.trim()) {
      Alert.alert('Adresse de collecte', 'Complétez l’adresse, le contact et le téléphone de collecte.');
      return;
    }
    if (!deliveryStreet.trim() || !deliveryContact.trim() || !deliveryPhone.trim()) {
      Alert.alert('Adresse de livraison', 'Complétez l’adresse, le contact et le téléphone de livraison.');
      return;
    }

    setSubmitting(true);
    try {
      await addShipment({
        senderId: user?.id ?? '',
        senderName: user ? `${user.firstName} ${user.lastName}` : '',
        type,
        weight: isSmall ? weightNum : undefined,
        price: isSmall ? livePrice : undefined,
        description: !isSmall ? description.trim() : undefined,
        dimensions: !isSmall && dimensions.trim() ? dimensions.trim() : undefined,
        pickupAddress: {
          street: pickupStreet.trim(),
          city: pickupCity.trim(),
          postalCode: '',
          country: 'France',
          contactName: pickupContact.trim(),
          contactPhone: pickupPhone.trim(),
          ...coordsFor(pickupCity),
        },
        deliveryAddress: {
          street: deliveryStreet.trim(),
          city: deliveryCity.trim(),
          postalCode: '',
          country: 'Tunisie',
          contactName: deliveryContact.trim(),
          contactPhone: deliveryPhone.trim(),
          ...coordsFor(deliveryCity),
        },
      });
      Alert.alert(
        'Envoi publié !',
        isSmall
          ? `Votre colis de ${weightNum} kg (${livePrice}€) est visible par les transporteurs.`
          : 'Votre annonce est publiée — les transporteurs peuvent maintenant faire leurs offres.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "L'envoi n'a pas pu être créé.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvel envoi</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Type selector */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeCard, isSmall && styles.typeCardActiveBlue]}
              activeOpacity={0.85}
              onPress={() => setType('small')}
            >
              <Ionicons name="cube" size={26} color={isSmall ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.typeTitle, isSmall && { color: COLORS.primary }]}>Petit colis</Text>
              <Text style={styles.typeSub}>Prix fixe · {PRICE_PER_KG}€/kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeCard, !isSmall && styles.typeCardActiveAmber]}
              activeOpacity={0.85}
              onPress={() => setType('large')}
            >
              <Ionicons name="bicycle" size={26} color={!isSmall ? COLORS.accent : COLORS.textLight} />
              <Text style={[styles.typeTitle, !isSmall && { color: COLORS.accent }]}>Gros objet</Text>
              <Text style={styles.typeSub}>Enchères des transporteurs</Text>
            </TouchableOpacity>
          </View>

          {/* Route */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Itinéraire</Text>
            <Field
              icon="location"
              iconColor={COLORS.primary}
              placeholder="Ville de collecte (France)"
              value={pickupCity}
              onChangeText={setPickupCity}
            />
            <Field
              icon="flag"
              iconColor={COLORS.secondary}
              placeholder="Ville de livraison (Tunisie)"
              value={deliveryCity}
              onChangeText={setDeliveryCity}
            />
          </Card>

          {/* Small: weight + live price */}
          {isSmall ? (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Poids du colis</Text>
              <Field
                icon="scale"
                placeholder="Poids total (kg)"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <View style={styles.priceBox}>
                <View>
                  <Text style={styles.priceLabel}>Prix calculé</Text>
                  <Text style={styles.priceFormula}>
                    {weightNum > 0 ? `${weightNum} kg × ${PRICE_PER_KG}€` : `${PRICE_PER_KG}€ par kg`}
                  </Text>
                </View>
                <Text style={styles.priceValue}>{livePrice > 0 ? `${livePrice}€` : '—'}</Text>
              </View>
            </Card>
          ) : (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Détails de l'objet</Text>
              <View style={[styles.inputWrap, styles.multilineWrap]}>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Description (ex : vélo électrique, réfrigérateur…)"
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
              <Field
                icon="resize"
                placeholder="Dimensions (ex : 180 × 60 × 100 cm)"
                value={dimensions}
                onChangeText={setDimensions}
              />
              <TouchableOpacity style={styles.photoHint} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={18} color={COLORS.textLight} />
                <Text style={styles.photoHintText}>Ajouter des photos — bientôt disponible</Text>
              </TouchableOpacity>
              <View style={styles.auctionInfo}>
                <Ionicons name="information-circle" size={18} color={COLORS.accent} />
                <Text style={styles.auctionInfoText}>
                  Les transporteurs proposeront leurs prix. Vous choisirez la meilleure offre.
                </Text>
              </View>
            </Card>
          )}

          {/* Pickup address */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de collecte (France)</Text>
            <Field icon="home" placeholder="Rue et numéro" value={pickupStreet} onChangeText={setPickupStreet} />
            <Field icon="person" placeholder="Nom du contact" value={pickupContact} onChangeText={setPickupContact} />
            <Field
              icon="call"
              placeholder="Téléphone du contact"
              keyboardType="phone-pad"
              value={pickupPhone}
              onChangeText={setPickupPhone}
            />
          </Card>

          {/* Delivery address */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de livraison (Tunisie)</Text>
            <Field icon="home" placeholder="Rue et numéro" value={deliveryStreet} onChangeText={setDeliveryStreet} />
            <Field icon="person" placeholder="Nom du contact" value={deliveryContact} onChangeText={setDeliveryContact} />
            <Field
              icon="call"
              placeholder="Téléphone du contact"
              keyboardType="phone-pad"
              value={deliveryPhone}
              onChangeText={setDeliveryPhone}
            />
          </Card>

          <TouchableOpacity
            style={[
              styles.publishButton,
              { backgroundColor: isSmall ? COLORS.primary : COLORS.accent },
              submitting && { opacity: 0.7 },
            ]}
            activeOpacity={0.85}
            onPress={handlePublish}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={COLORS.white} />
                <Text style={styles.publishText}>Publier l'envoi</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  iconColor = COLORS.textLight,
  ...inputProps
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <TextInput style={styles.input} placeholderTextColor={COLORS.textLight} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },

  scroll: { padding: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xxxl },

  typeRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  typeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  typeCardActiveBlue: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeCardActiveAmber: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  typeTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  typeSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },

  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 50,
  },
  input: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, paddingVertical: SPACING.md },
  multilineWrap: { alignItems: 'flex-start' },
  multiline: { minHeight: 88, textAlignVertical: 'top' },

  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  priceLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primaryDark },
  priceFormula: { fontSize: FONTS.sizes.xs, color: COLORS.primaryDark, marginTop: 2, opacity: 0.8 },
  priceValue: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.primary },

  photoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  photoHintText: { fontSize: FONTS.sizes.sm, color: COLORS.textLight },

  auctionInfo: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  auctionInfoText: { flex: 1, fontSize: FONTS.sizes.sm, color: '#92400E' },

  publishButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  publishText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
