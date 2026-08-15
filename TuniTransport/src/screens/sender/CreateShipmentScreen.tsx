// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — CreateShipmentScreen (STEP 8)
// small: live price = weight × 4€/kg (effets personnels non commerciaux,
// déclaration obligatoire) · large: accord personnalisé (devis négociable
// des transporteurs et/ou entente directe via la messagerie).
// La publication exige l'acceptation des Conditions, Objets interdits et
// Décharge de responsabilité (checkbox bloquante).
// Sert aussi d'écran d'édition : `editShipmentId` pré-remplit le formulaire
// et la sauvegarde met à jour l'annonce (uniquement tant qu'elle est
// « pending », avant l'acceptation d'une offre).
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
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card } from '../../components';
import VerificationRequired from '../../components/VerificationRequired';
import { LegalConsent, ConsentCheckbox } from '../../components/LegalConsent';
import {
  PRICE_PER_KG,
  HOME_PICKUP_FEE,
  computeWeightPrice,
  computeTotalPrice,
  OVERSIZED_EXAMPLES,
} from '../../utils/pricing';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { coordsFor } from '../../services/mockData';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';
import { IS_LIVE } from '../../services/supabase';
import { uploadShipmentPhoto } from '../../services/api';
import { ShipmentType, HandoverMode, Item } from '../../types';
import { getErrorMessage } from '../../utils/errors';

const MAX_PHOTOS = 5;

export default function CreateShipmentScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateShipment'>>();
  const { user } = useAuth();
  const { addShipment, updateShipment, getShipmentById } = useData();

  // Mode édition : l'annonce existante pré-remplit le formulaire.
  const editShipmentId = route.params?.editShipmentId;
  const editing = editShipmentId ? getShipmentById(editShipmentId) : undefined;
  const isEditing = !!editing;

  const [type, setType] = useState<ShipmentType>(editing?.type ?? route.params?.type ?? 'small');
  // Route
  const [pickupCity, setPickupCity] = useState(editing?.pickupAddress.city ?? '');
  const [deliveryCity, setDeliveryCity] = useState(editing?.deliveryAddress.city ?? '');
  // Small parcel
  const [weight, setWeight] = useState(editing?.weight != null ? String(editing.weight) : '');
  // Large item
  const [description, setDescription] = useState(editing?.description ?? '');
  const [dimensions, setDimensions] = useState(editing?.dimensions ?? '');
  // Addresses
  const [pickupStreet, setPickupStreet] = useState(editing?.pickupAddress.street ?? '');
  const [pickupContact, setPickupContact] = useState(editing?.pickupAddress.contactName ?? '');
  const [pickupPhone, setPickupPhone] = useState(editing?.pickupAddress.contactPhone ?? '');
  const [deliveryStreet, setDeliveryStreet] = useState(editing?.deliveryAddress.street ?? '');
  const [deliveryContact, setDeliveryContact] = useState(editing?.deliveryAddress.contactName ?? '');
  const [deliveryPhone, setDeliveryPhone] = useState(editing?.deliveryAddress.contactPhone ?? '');
  // Contenu déclaré. Le champ existait en base et s'affichait partout —
  // détail de l'envoi, étiquette scannée — mais AUCUN écran ne le
  // remplissait : le transporteur emportait un colis dont il ne savait
  // rien, alors que c'est lui qui répond à la douane.
  const [items, setItems] = useState<{ name: string; quantity: string; weight: string }[]>(
    editing?.items?.length
      ? editing.items.map((it) => ({
          name: it.name,
          quantity: String(it.quantity),
          weight: String(it.weight),
        }))
      : [{ name: '', quantity: '1', weight: '' }]
  );
  // Remise du colis : le transporteur vient (frais) ou l'expéditeur dépose.
  const [handoverMode, setHandoverMode] = useState<HandoverMode>(
    editing?.handoverMode ?? 'point'
  );
  // Photos (large items)
  const [photoUris, setPhotoUris] = useState<string[]>(editing?.photos ?? []);

  // Consentements obligatoires (déjà donnés lors de la publication en édition)
  const [nonCommercial, setNonCommercial] = useState(!!editing?.nonCommercialDeclaredAt);
  const [legalAccepted, setLegalAccepted] = useState(!!editing?.termsAcceptedAt);

  const [submitting, setSubmitting] = useState(false);

  const isSmall = type === 'small';
  const declaredItems: Item[] = items
    .filter((it) => it.name.trim())
    .map((it) => ({
      name: it.name.trim(),
      category: '',
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
      weight: parseFloat(it.weight.replace(',', '.')) || 0,
    }));
  const itemsWeight = declaredItems.reduce((sum, it) => sum + it.weight, 0);
  // Le poids facturé vient des lignes déclarées quand il y en a : deux
  // chiffres différents à l'écran (total saisi et somme des lignes) auraient
  // été une invitation à la contestation.
  const weightNum = isSmall
    ? Math.round(itemsWeight * 100) / 100
    : parseFloat(weight.replace(',', '.')) || 0;
  const basePrice = useMemo(() => computeWeightPrice(weightNum), [weightNum]);
  const pickupFee = handoverMode === 'home' ? HOME_PICKUP_FEE : 0;
  const livePrice = useMemo(
    () => computeTotalPrice(weightNum, handoverMode),
    [weightNum, handoverMode]
  );

  const captureFrom = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permission requise', "Autorisez l'accès pour ajouter des photos.");
      return;
    }
    const remaining = MAX_PHOTOS - photoUris.length;
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
          });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri).filter(Boolean);
    if (uris.length === 0) return;
    setPhotoUris((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
  };

  const addPhoto = () => {
    if (photoUris.length >= MAX_PHOTOS) {
      showAlert('Limite atteinte', `Vous pouvez ajouter au maximum ${MAX_PHOTOS} photos.`);
      return;
    }
    // No camera capture in the browser: open the file picker directly.
    if (Platform.OS === 'web') {
      captureFrom('library');
      return;
    }
    showAlert('Ajouter une photo', 'Choisissez une source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Caméra', onPress: () => captureFrom('camera') },
      { text: 'Galerie', onPress: () => captureFrom('library') },
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  async function handlePublish() {
    // Une annonce n'est modifiable que tant qu'aucune offre n'a été acceptée.
    if (isEditing && editing.status !== 'pending') {
      showAlert(
        'Modification impossible',
        "Cet envoi a déjà été pris en charge : l'annonce ne peut plus être modifiée."
      );
      return;
    }
    // Live mode requires a verified identity (enforced by RLS): guide the
    // user to the KYC screen instead of letting the insert fail server-side.
    // (L'édition ne crée pas de ligne : la vérification a déjà eu lieu.)
    if (!isEditing && IS_LIVE && user?.identityStatus !== 'verified') {
      showAlert(
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
      showAlert('Champs requis', 'Indiquez la ville de collecte et la ville de livraison.');
      return;
    }
    if (isSmall && declaredItems.length === 0) {
      showAlert('Contenu requis', 'Détaillez ce que contient le colis, ligne par ligne.');
      return;
    }
    if (isSmall && weightNum <= 0) {
      showAlert('Poids requis', 'Indiquez le poids de chaque ligne, en kg.');
      return;
    }
    if (!isSmall && !description.trim()) {
      showAlert('Description requise', "Décrivez l'objet à transporter.");
      return;
    }
    if (!pickupStreet.trim() || !pickupContact.trim() || !pickupPhone.trim()) {
      showAlert('Adresse de collecte', 'Complétez l’adresse, le contact et le téléphone de collecte.');
      return;
    }
    if (!deliveryStreet.trim() || !deliveryContact.trim() || !deliveryPhone.trim()) {
      showAlert('Adresse de livraison', 'Complétez l’adresse, le contact et le téléphone de livraison.');
      return;
    }
    if (isSmall && !nonCommercial) {
      showAlert(
        'Déclaration requise',
        `Le tarif de ${PRICE_PER_KG}€/kg est réservé aux effets personnels sans caractère commercial. Cochez la déclaration pour continuer.`
      );
      return;
    }
    if (!legalAccepted) {
      showAlert(
        'Consentement requis',
        'Vous devez accepter les Conditions générales, la liste des Objets interdits et la Décharge de responsabilité avant de publier un envoi.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // In live mode the photos go to Supabase Storage first; in demo mode
      // the local URIs are kept as-is (in-memory data only). En édition, les
      // photos déjà en ligne (URL http…) sont conservées telles quelles.
      const shipmentPhotos = photoUris;
      const photoUrls =
        IS_LIVE && user
          ? await Promise.all(
              shipmentPhotos.map((uri) =>
                uri.startsWith('http') ? Promise.resolve(uri) : uploadShipmentPhoto(user.id, uri)
              )
            )
          : shipmentPhotos;

      const consentAt = new Date().toISOString();
      const pickupAddress = {
        street: pickupStreet.trim(),
        city: pickupCity.trim(),
        postalCode: '',
        country: 'France',
        contactName: pickupContact.trim(),
        contactPhone: pickupPhone.trim(),
        ...coordsFor(pickupCity),
      };
      const deliveryAddress = {
        street: deliveryStreet.trim(),
        city: deliveryCity.trim(),
        postalCode: '',
        country: 'Tunisie',
        contactName: deliveryContact.trim(),
        contactPhone: deliveryPhone.trim(),
        ...coordsFor(deliveryCity),
      };

      if (isEditing) {
        await updateShipment(editing.id, {
          type,
          weight: isSmall ? weightNum : undefined,
          items: isSmall ? declaredItems : undefined,
          price: isSmall ? livePrice : undefined,
          description: !isSmall ? description.trim() : undefined,
          dimensions: !isSmall && dimensions.trim() ? dimensions.trim() : undefined,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          nonCommercialDeclaredAt: isSmall
            ? editing.nonCommercialDeclaredAt ?? consentAt
            : undefined,
          pickupAddress,
          deliveryAddress,
          trackingHistory: [
            ...editing.trackingHistory,
            {
              id: `te-edit-${Date.now()}`,
              status: 'pending',
              description: "Annonce modifiée par l'expéditeur",
              location: `${pickupAddress.city}, ${pickupAddress.country}`,
              timestamp: consentAt,
            },
          ],
        });
        showAlert(
          'Annonce modifiée',
          'Vos changements sont enregistrés — les transporteurs voient désormais la version à jour.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      await addShipment({
        termsAcceptedAt: consentAt,
        nonCommercialDeclaredAt: isSmall ? consentAt : undefined,
        senderId: user?.id ?? '',
        senderName: user ? `${user.firstName} ${user.lastName}` : '',
        type,
        weight: isSmall ? weightNum : undefined,
        items: isSmall ? declaredItems : undefined,
        price: isSmall ? livePrice : undefined,
        description: !isSmall ? description.trim() : undefined,
        dimensions: !isSmall && dimensions.trim() ? dimensions.trim() : undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
        pickupAddress,
        deliveryAddress,
        handoverMode,
        handoverFee: pickupFee,
      });
      showAlert(
        'Envoi publié !',
        isSmall
          ? `Votre colis de ${weightNum} kg (${livePrice}€) est visible par les transporteurs.`
          : 'Votre annonce est publiée — les transporteurs peuvent maintenant faire leurs offres.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      showAlert(
        'Erreur',
        getErrorMessage(e, isEditing ? "L'envoi n'a pas pu être modifié." : "L'envoi n'a pas pu être créé.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Lien d'édition vers une annonce qui n'existe plus (ou pas encore chargée).
  if (editShipmentId && !editing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier l'envoi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundText}>Envoi introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Identité non vérifiée : bloquer AVANT le formulaire (au lieu d'échouer à
  // la publication). L'édition d'un envoi existant n'est pas concernée.
  if (!isEditing && IS_LIVE && user && user.identityStatus !== 'verified') {
    return <VerificationRequired status={user.identityStatus} action="publier un envoi" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Modifier l'envoi" : 'Nouvel envoi'}</Text>
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
              <Text style={styles.typeSub}>Accord personnalisé · prix négociable</Text>
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
              <Text style={styles.sectionTitle}>Contenu du colis</Text>
              <Text style={styles.handoverIntro}>
                Détaillez ce que contient le colis. Le transporteur doit savoir ce qu'il emporte —
                c'est lui qui répond à la douane.
              </Text>
              {items.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={[styles.inputWrap, { flex: 3 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Désignation (ex : vêtements)"
                      placeholderTextColor={COLORS.textLight}
                      value={it.name}
                      onChangeText={(v) =>
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))
                      }
                    />
                  </View>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Qté"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="number-pad"
                      value={it.quantity}
                      onChangeText={(v) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x))
                        )
                      }
                    />
                  </View>
                  <View style={[styles.inputWrap, { flex: 1.3 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="kg"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="decimal-pad"
                      value={it.weight}
                      onChangeText={(v) =>
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, weight: v } : x)))
                      }
                    />
                  </View>
                  {items.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      accessibilityLabel="Supprimer cette ligne"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addItem}
                onPress={() =>
                  setItems((prev) => [...prev, { name: '', quantity: '1', weight: '' }])
                }
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addItemText}>Ajouter une ligne</Text>
              </TouchableOpacity>
              <View style={styles.priceBox}>
                <View>
                  <Text style={styles.priceLabel}>Prix calculé</Text>
                  <Text style={styles.priceFormula}>
                    {weightNum > 0 ? `${weightNum} kg × ${PRICE_PER_KG}€` : `${PRICE_PER_KG}€ par kg`}
                    {pickupFee > 0 ? ` + ${pickupFee}€ de déplacement` : ''}
                  </Text>
                </View>
                <Text style={styles.priceValue}>{livePrice > 0 ? `${livePrice}€` : '—'}</Text>
              </View>
              <View style={styles.declarationBox}>
                <ConsentCheckbox checked={nonCommercial} onToggle={() => setNonCommercial(!nonCommercial)}>
                  Je certifie que ce colis contient uniquement des effets personnels, sans caractère
                  commercial.
                </ConsentCheckbox>
                <Text style={styles.declarationHint}>
                  Le tarif fixe de {PRICE_PER_KG}€/kg est réservé aux bagages personnels et ordinaires.
                  Les envois à caractère commercial ne sont pas éligibles.
                </Text>
              </View>
            </Card>
          ) : (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Détails de l'objet</Text>
              <View style={[styles.inputWrap, styles.multilineWrap]}>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder={`Description (ex : ${OVERSIZED_EXAMPLES[3].toLowerCase()}, ${OVERSIZED_EXAMPLES[0].toLowerCase()}…)`}
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
              <View style={styles.auctionInfo}>
                <Ionicons name="information-circle" size={18} color={COLORS.accent} />
                <Text style={styles.auctionInfoText}>
                  Objet hors gabarit : le prix résulte d'un accord personnalisé. Les transporteurs
                  proposent un devis négociable, et vous pouvez discuter du prix directement avec eux
                  via la messagerie avant d'accepter.
                </Text>
              </View>
            </Card>
          )}

          {/* Photos (tous les envois) — jusqu'à 5 */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Photos du colis</Text>
            <Text style={styles.photoHint}>
              Ajoutez jusqu'à {MAX_PHOTOS} photos ({photoUris.length}/{MAX_PHOTOS}).
            </Text>
            <View style={styles.photoRow}>
              {photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    activeOpacity={0.8}
                    onPress={() => removePhoto(index)}
                    accessibilityLabel="Supprimer la photo"
                  >
                    <Ionicons name="close" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < MAX_PHOTOS && (
                <TouchableOpacity style={styles.photoAdd} activeOpacity={0.7} onPress={addPhoto}>
                  <Ionicons name="camera-outline" size={22} color={COLORS.textLight} />
                  <Text style={styles.photoAddText}>
                    {photoUris.length === 0 ? 'Ajouter' : `${photoUris.length}/${MAX_PHOTOS}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Remise du colis */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Remise du colis</Text>
            <Text style={styles.handoverIntro}>
              Comment le transporteur récupère-t-il votre colis ?
            </Text>
            {(
              [
                {
                  mode: 'point' as HandoverMode,
                  icon: 'location-outline' as const,
                  title: 'Je dépose au point de collecte',
                  detail:
                    'Vous convenez du lieu avec le transporteur. Vous pouvez déposer et repartir : vous serez prévenu dès la prise en charge.',
                  extra: 'Sans frais',
                },
                {
                  mode: 'home' as HandoverMode,
                  icon: 'home-outline' as const,
                  title: 'Le transporteur vient chez moi',
                  detail: "Il se déplace jusqu'à l'adresse de collecte ci-dessous.",
                  extra: `+ ${HOME_PICKUP_FEE}€ de déplacement`,
                },
              ]
            ).map((opt) => {
              const active = handoverMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  activeOpacity={0.85}
                  onPress={() => setHandoverMode(opt.mode)}
                  style={[styles.handoverCard, active && styles.handoverCardActive]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={active ? COLORS.primary : COLORS.textLight}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.handoverTitle, active && { color: COLORS.primary }]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.handoverDetail}>{opt.detail}</Text>
                    <Text style={[styles.handoverExtra, active && { color: COLORS.primary }]}>
                      {opt.extra}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>

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

          {/* Consentement légal obligatoire (expéditeur) */}
          <View style={{ marginBottom: SPACING.lg }}>
            <LegalConsent
              checked={legalAccepted}
              onToggle={() => setLegalAccepted(!legalAccepted)}
              onOpenPage={(page) => navigation.navigate('Legal', { page })}
            />
          </View>

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
                <Ionicons name={isEditing ? 'checkmark' : 'paper-plane'} size={18} color={COLORS.white} />
                <Text style={styles.publishText}>
                  {isEditing ? 'Enregistrer les modifications' : "Publier l'envoi"}
                </Text>
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
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },

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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  addItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xs },
  addItemText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  handoverIntro: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  handoverCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  handoverCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  handoverTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  handoverDetail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  handoverExtra: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  priceLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primaryDark },
  declarationBox: { marginTop: SPACING.md, gap: SPACING.sm },
  declarationHint: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, lineHeight: 16 },
  priceFormula: { fontSize: FONTS.sizes.xs, color: COLORS.primaryDark, marginTop: 2, opacity: 0.8 },
  priceValue: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.primary },

  photoHint: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  photoThumbWrap: { position: 'relative' },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },

  auctionInfo: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  auctionInfoText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.accent },

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
