// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Demandes disponibles (transporteur) — STEP 9
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { getErrorMessage } from '../../utils/errors';
import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Card, EmptyState } from '../../components';
import { LegalConsent } from '../../components/LegalConsent';
import { LegalPageKey } from '../../content/legal';
import { PRICE_PER_KG } from '../../utils/pricing';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation, MainTabParamList } from '../../navigation/AppNavigator';
import { IS_LIVE } from '../../services/supabase';
import { Shipment } from '../../types';

export default function AvailableShipmentsScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<MainTabParamList, 'Demandes'>>();
  const { user } = useAuth();
  const { shipments, addBid, updateShipment } = useData();

  // Shipment id whose inline bid form is open
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [sending, setSending] = useState(false);
  // Shipment id whose inline accept panel (small parcel) is open
  const [acceptingOn, setAcceptingOn] = useState<string | null>(null);
  // Consentement légal obligatoire avant offre ou prise en charge
  const [legalAccepted, setLegalAccepted] = useState(false);

  const openLegalPage = (page: LegalPageKey) => navigation.navigate('Legal', { page });

  // "Faire une offre" on the detail screen lands here with the shipment id:
  // open its inline bid form directly.
  useEffect(() => {
    if (route.params?.bidShipmentId) {
      setBiddingOn(route.params.bidShipmentId);
    }
  }, [route.params?.bidShipmentId]);

  const pending = useMemo(
    () => shipments.filter((s) => s.status === 'pending'),
    [shipments]
  );

  const closeBidForm = () => {
    setBiddingOn(null);
    setBidPrice('');
    setBidMessage('');
    setLegalAccepted(false);
  };

  const closeAcceptPanel = () => {
    setAcceptingOn(null);
    setLegalAccepted(false);
  };

  // Live mode requires a verified identity before bidding or accepting.
  const requireVerifiedIdentity = (): boolean => {
    if (IS_LIVE && user?.identityStatus !== 'verified') {
      showAlert(
        'Vérification requise',
        'Vous devez faire vérifier votre identité avant de prendre des envois.',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Vérifier mon identité',
            onPress: () => navigation.navigate('IdentityVerification'),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const submitBid = async (shipment: Shipment) => {
    if (!requireVerifiedIdentity()) return;
    const price = parseFloat(bidPrice.replace(',', '.'));
    if (!price || price <= 0) {
      showAlert('Prix invalide', 'Veuillez saisir un montant en euros.');
      return;
    }
    if (!legalAccepted) {
      showAlert(
        'Consentement requis',
        'Vous devez accepter les Conditions générales, la liste des Objets interdits et la Décharge de responsabilité avant de faire une offre.'
      );
      return;
    }
    if (!user) return;
    setSending(true);
    try {
      const estimated = new Date();
      estimated.setDate(estimated.getDate() + 7);
      await addBid({
        transporterId: user.id,
        transporterName: `${user.firstName} ${user.lastName}`,
        transporterRating: user.rating,
        shipmentId: shipment.id,
        price,
        estimatedDelivery: estimated.toISOString(),
        message: bidMessage.trim() || undefined,
      });
      closeBidForm();
      showAlert(
        'Offre envoyée',
        'Votre offre a été transmise à l’expéditeur. Elle reste négociable : il pourra en discuter avec vous via la messagerie avant de l’accepter.'
      );
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Impossible d’envoyer l’offre.'));
    } finally {
      setSending(false);
    }
  };

  const openAcceptPanel = (shipment: Shipment) => {
    if (!requireVerifiedIdentity()) return;
    closeBidForm();
    setAcceptingOn(shipment.id);
    setLegalAccepted(false);
  };

  const confirmAcceptSmall = async (shipment: Shipment) => {
    if (!user) return;
    if (!legalAccepted) {
      showAlert(
        'Consentement requis',
        'Vous devez accepter les Conditions générales, la liste des Objets interdits et la Décharge de responsabilité avant de prendre en charge cet envoi.'
      );
      return;
    }
    try {
      await updateShipment(shipment.id, {
        status: 'accepted',
        transporterId: user.id,
        transporterName: `${user.firstName} ${user.lastName}`,
        trackingHistory: [
          ...shipment.trackingHistory,
          {
            id: `te-${Date.now()}`,
            status: 'accepted',
            description: `Envoi accepté par ${user.firstName} ${user.lastName}`,
            location: shipment.pickupAddress.city,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      closeAcceptPanel();
      showAlert('Envoi accepté', 'L’expéditeur a été notifié.');
    } catch (e) {
      showAlert('Erreur', getErrorMessage(e, 'Action impossible.'));
    }
  };

  const renderItem = ({ item }: { item: Shipment }) => {
    const isLarge = item.type === 'large';
    const isBidding = biddingOn === item.id;
    const isAccepting = acceptingOn === item.id;
    return (
      <Card style={styles.card}>
        {/* Header row */}
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={[styles.typeIcon, { backgroundColor: isLarge ? COLORS.accentLight : COLORS.primaryLight }]}>
              <Ionicons
                name={isLarge ? 'cube' : 'cube-outline'}
                size={18}
                color={isLarge ? COLORS.accent : COLORS.primary}
              />
            </View>
            <Text style={styles.cardTitle}>
              {isLarge ? 'Gros objet' : 'Petit colis'}
            </Text>
          </View>
          {isLarge ? (
            <View style={styles.auctionChip}>
              <Ionicons name="hammer-outline" size={12} color={COLORS.accent} />
              <Text style={styles.auctionChipText}>Enchères</Text>
            </View>
          ) : null}
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.routeText}>
            {item.pickupAddress.city}, {item.pickupAddress.country}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} style={{ marginHorizontal: SPACING.xs }} />
          <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.routeText}>
            {item.deliveryAddress.city}, {item.deliveryAddress.country}
          </Text>
        </View>

        {/* Body */}
        {isLarge ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
            {item.dimensions ? ` · ${item.dimensions}` : ''}
          </Text>
        ) : (
          <Text style={styles.meta}>
            {item.weight ?? 0} kg · {item.price ?? 0}€
          </Text>
        )}
        <Text style={styles.sender}>Expéditeur : {item.senderName}</Text>

        {/* Actions */}
        {!isBidding && !isAccepting ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: item.id })}
            >
              <Text style={styles.secondaryBtnText}>Détails</Text>
            </TouchableOpacity>
            {isLarge ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  closeAcceptPanel();
                  setLegalAccepted(false);
                  setBiddingOn(item.id);
                }}
              >
                <Ionicons name="hammer" size={16} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>Faire une offre</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }]}
                onPress={() => openAcceptPanel(item)}
              >
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>Accepter</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isAccepting ? (
          <View style={styles.bidForm}>
            <Text style={styles.engageText}>
              Vous vous engagez à transporter ce colis de {item.weight ?? 0} kg pour{' '}
              {item.price ?? 0}€ ({PRICE_PER_KG}€/kg — effets personnels non commerciaux).
            </Text>
            <LegalConsent
              checked={legalAccepted}
              onToggle={() => setLegalAccepted(!legalAccepted)}
              onOpenPage={openLegalPage}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={closeAcceptPanel}>
                <Text style={styles.secondaryBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }, !legalAccepted && { opacity: 0.5 }]}
                onPress={() => confirmAcceptSmall(item)}
              >
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.bidForm}>
            <Text style={styles.bidLabel}>Votre offre (€)</Text>
            <TextInput
              style={styles.input}
              value={bidPrice}
              onChangeText={setBidPrice}
              placeholder="Ex : 80"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
            />
            <Text style={styles.bidLabel}>Message (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bidMessage}
              onChangeText={setBidMessage}
              placeholder="Présentez votre offre à l’expéditeur…"
              placeholderTextColor={COLORS.textLight}
              multiline
            />
            <Text style={styles.negotiableHint}>
              Votre devis est négociable : l’expéditeur pourra en discuter avec vous via la
              messagerie avant de l’accepter.
            </Text>
            <LegalConsent
              checked={legalAccepted}
              onToggle={() => setLegalAccepted(!legalAccepted)}
              onOpenPage={openLegalPage}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={closeBidForm} disabled={sending}>
                <Text style={styles.secondaryBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, sending && { opacity: 0.6 }]}
                onPress={() => submitBid(item)}
                disabled={sending}
              >
                <Ionicons name="send" size={16} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>{sending ? 'Envoi…' : 'Envoyer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Demandes disponibles</Text>
          <Text style={styles.subtitle}>
            {pending.length} envoi{pending.length > 1 ? 's' : ''} en attente
          </Text>
        </View>
        <FlatList
          data={pending}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Aucune demande"
              message="Aucun envoi en attente pour le moment. Revenez bientôt !"
            />
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 2 },
  list: { padding: SPACING.xl, paddingTop: SPACING.sm, gap: SPACING.md, flexGrow: 1 },
  card: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  auctionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  auctionChipText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.accent },
  routeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
  routeText: { fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '600' },
  description: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  meta: { fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '700' },
  sender: { fontSize: FONTS.sizes.sm, color: COLORS.textLight },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: FONTS.sizes.md },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  bidForm: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  bidLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  engageText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 20 },
  negotiableHint: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, lineHeight: 16 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
});
