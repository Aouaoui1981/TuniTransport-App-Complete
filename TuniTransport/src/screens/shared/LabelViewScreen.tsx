// ──────────────────────────────────────────────────────────────────────────
// THL — étiquette ouverte depuis un lien
//
// Ce que l'on voit quand on vise le QR d'une étiquette avec l'appareil
// photo du téléphone. Même contenu que le scanner intégré, sans la caméra —
// mais sans le bouton de prise en charge non plus : confirmer exige le
// scanner de l'application, donc le colis sous les yeux.
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card } from '../../components';
import { LabelDetails, LabelError as LabelErrorCard } from '../../components/LabelDetails';
import { IS_LIVE } from '../../services/supabase';
import {
  resolveLabel,
  LabelError,
  ScannedLabel,
  LabelScanError,
} from '../../services/api';
import { useAppNavigation, RootStackParamList } from '../../navigation/AppNavigator';

export default function LabelViewScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'LabelView'>>();
  const { shipmentId, token } = route.params;

  const [label, setLabel] = useState<ScannedLabel | null>(null);
  const [error, setError] = useState<LabelScanError | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!IS_LIVE) throw new LabelError('UNKNOWN');
        const res = await resolveLabel(shipmentId, token);
        if (alive) setLabel(res);
      } catch (e) {
        if (alive) setError(e instanceof LabelError ? e.code : 'UNKNOWN');
      }
    })();
    return () => {
      alive = false;
    };
  }, [shipmentId, token]);

  if (!label && !error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <LabelErrorCard code={error} /> : label ? <LabelDetails label={label} /> : null}

        {label?.viewerRole === 'transporter' &&
        (label.status === 'accepted' || label.status === 'dropped_off') ? (
          <Card>
            <Text style={styles.hint}>
              Pour confirmer la prise en charge, scannez cette étiquette depuis l'application —
              le colis doit être devant vous.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('ScanLabel')}>
              <Text style={styles.btnText}>Ouvrir le scanner</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {label ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => navigation.navigate('ShipmentDetail', { shipmentId: label.id })}
          >
            <Text style={[styles.btnText, { color: COLORS.primary }]}>Voir le suivi de l'envoi</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  hint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.sizes.md },
});
