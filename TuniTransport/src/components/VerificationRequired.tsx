// ──────────────────────────────────────────────────────────────────────────
// THL — Écran « Vérification requise »
// Affiché à la place d'un formulaire (publier un envoi / un trajet) tant que
// l'identité de l'utilisateur n'est pas vérifiée. Redirige vers la KYC.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';
import { useAppNavigation } from '../navigation/AppNavigator';
import { IdentityStatus } from '../types';

export default function VerificationRequired({
  status,
  action,
}: {
  status?: IdentityStatus;
  action: string; // ex. « publier un envoi »
}) {
  const navigation = useAppNavigation();
  const pending = status === 'pending';
  const rejected = status === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: pending ? COLORS.accentLight : COLORS.primaryLight }]}>
          <Ionicons
            name={pending ? 'time-outline' : 'shield-checkmark-outline'}
            size={40}
            color={pending ? COLORS.accent : COLORS.primary}
          />
        </View>
        <Text style={styles.title}>{pending ? 'Vérification en cours' : 'Vérification requise'}</Text>
        <Text style={styles.text}>
          {pending
            ? `Votre identité est en cours de vérification (sous 24 h maximum). Vous pourrez ${action} dès que votre compte sera approuvé — vous serez notifié par e-mail.`
            : rejected
              ? `Votre dernière vérification a été refusée. Veuillez la refaire avant de ${action}.`
              : `Vous devez d'abord faire vérifier votre identité avant de ${action}.`}
        </Text>

        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('IdentityVerification')}
        >
          <Ionicons name="id-card-outline" size={18} color={COLORS.white} />
          <Text style={styles.btnText}>{pending ? 'Voir le statut' : 'Vérifier mon identité'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  text: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xxl,
  },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  back: { marginTop: SPACING.lg, minHeight: 32, justifyContent: 'center' },
  backText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONTS.sizes.md },
});
