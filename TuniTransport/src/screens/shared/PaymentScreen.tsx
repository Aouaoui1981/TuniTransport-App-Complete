// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Paiement — STEP 10
// Demo mode: simulated card form → processing → success.
// Live mode: createPaymentIntent → Stripe Payment Sheet (dynamic require so
// the demo build keeps working inside Expo Go without the native module).
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, RouteProp, CommonActions, useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../utils/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { createPaymentIntent, IS_STRIPE_LIVE } from '../../services/stripe';
import { scheduleLocalNotification } from '../../services/notifications';

type Step = 'form' | 'processing' | 'success';

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Payment'>>();
  const { shipmentId, amount } = route.params;

  const [step, setStep] = useState<Step>('form');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const shortId = shipmentId.slice(-4).toUpperCase();

  const goHome = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'Main' }));
  };

  const payLive = async () => {
    setStep('processing');
    try {
      const intent = await createPaymentIntent(amount, 'eur', shipmentId);
      // Loaded lazily: the native Stripe module only exists in dev/EAS builds.
      const stripeSdk = require('@stripe/stripe-react-native');
      const { error: initError } = await stripeSdk.initPaymentSheet({
        merchantDisplayName: 'TuniTransport',
        paymentIntentClientSecret: intent.clientSecret,
        defaultBillingDetails: { address: { country: 'FR' } },
      });
      if (initError) throw new Error(initError.message);
      const { error: presentError } = await stripeSdk.presentPaymentSheet();
      if (presentError) throw new Error(presentError.message);
      setStep('success');
      scheduleLocalNotification('Paiement confirmé', `Votre paiement de ${amount}€ a bien été reçu.`);
    } catch (e: any) {
      setStep('form');
      Alert.alert('Paiement annulé', e?.message ?? 'Le paiement n’a pas abouti.');
    }
  };

  const payDemo = async () => {
    if (cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvc.length < 3) {
      Alert.alert('Carte incomplète', 'Veuillez renseigner les informations de la carte.');
      return;
    }
    setStep('processing');
    try {
      await createPaymentIntent(amount, 'eur', shipmentId);
      setStep('success');
      scheduleLocalNotification('Paiement confirmé', `Votre paiement de ${amount}€ a bien été reçu.`);
    } catch {
      setStep('form');
      Alert.alert('Erreur', 'Le paiement n’a pas abouti. Réessayez.');
    }
  };

  const pay = () => (IS_STRIPE_LIVE ? payLive() : payDemo());

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={54} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>Paiement réussi !</Text>
          <Text style={styles.successAmount}>{amount}€</Text>
          <Text style={styles.successNote}>Le transporteur sera notifié.</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
            <Text style={styles.homeBtnText}>Retour à l’accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Amount card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.amountCard}
        >
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amountValue}>{amount}€</Text>
          <Text style={styles.amountShipment}>Envoi #{shortId}</Text>
        </LinearGradient>

        {/* Stripe badge */}
        <View style={styles.stripeBadge}>
          <Ionicons name="lock-closed" size={14} color={COLORS.secondary} />
          <Text style={styles.stripeBadgeText}>Paiement sécurisé par Stripe</Text>
        </View>

        {IS_STRIPE_LIVE ? (
          <Text style={styles.liveHint}>
            Vous allez être redirigé vers le formulaire de paiement sécurisé.
          </Text>
        ) : (
          <>
            {/* Demo card form */}
            <Text style={styles.label}>Numéro de carte</Text>
            <View style={styles.inputRow}>
              <Ionicons name="card-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expiration</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM/AA"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CVC</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={cvc}
                    onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.payBtn, step === 'processing' && { opacity: 0.7 }]}
          onPress={pay}
          disabled={step === 'processing'}
        >
          {step === 'processing' ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={COLORS.white} />
              <Text style={styles.payBtnText}>Payer {amount}€</Text>
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
  amountCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.lg,
  },
  amountLabel: { color: '#DBEAFECC', fontSize: FONTS.sizes.md, fontWeight: '600' },
  amountValue: { color: COLORS.white, fontSize: 44, fontWeight: '800' },
  amountShipment: { color: '#DBEAFECC', fontSize: FONTS.sizes.sm },
  stripeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: SPACING.lg,
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  stripeBadgeText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.secondaryDark },
  liveHint: {
    marginTop: SPACING.xl,
    textAlign: 'center',
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
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
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  twoCols: { flexDirection: 'row', gap: SPACING.md },
  payBtn: {
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
  payBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.md,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.lg,
  },
  successTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text },
  successAmount: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.success },
  successNote: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  homeBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl,
    ...SHADOWS.md,
  },
  homeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
