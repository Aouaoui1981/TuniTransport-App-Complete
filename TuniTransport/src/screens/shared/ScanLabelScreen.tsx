// ──────────────────────────────────────────────────────────────────────────
// THL — Scanner une étiquette
//
// Lecture du QR depuis l'application, sans passer par l'appareil photo du
// téléphone. Le QR ne contient qu'un identifiant et un jeton : c'est le
// serveur qui décide quoi montrer, et à qui.
//
// Une expédition acceptée appartient à SON transporteur. Un autre
// transporteur qui scanne l'étiquette est refusé, et on le lui dit
// clairement plutôt que de le laisser devant un échec muet.
// ──────────────────────────────────────────────────────────────────────────
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card } from '../../components';
import { parseLabelUrl } from '../../config/app';
import { IS_LIVE } from '../../services/supabase';
import { resolveLabel, LabelError, ScannedLabel, LabelScanError } from '../../services/api';

const MESSAGES: Record<LabelScanError, { title: string; detail: string }> = {
  NOT_AUTHENTICATED: {
    title: 'Session expirée',
    detail: 'Reconnectez-vous, puis scannez à nouveau.',
  },
  LABEL_UNKNOWN: {
    title: 'Étiquette inconnue',
    detail: "Cet envoi n'existe pas ou a été supprimé.",
  },
  LABEL_TOKEN_INVALID: {
    title: 'Étiquette invalide',
    detail: "Ce code ne correspond pas à l'envoi. Vérifiez que l'étiquette n'est pas abîmée.",
  },
  LABEL_ASSIGNED_TO_OTHER: {
    title: 'Colis attribué à un autre transporteur',
    detail:
      "Cet envoi est déjà pris en charge par un autre transporteur. Vous ne pouvez pas le collecter sans son accord.",
  },
  LABEL_FORBIDDEN: {
    title: 'Accès refusé',
    detail: "Vous n'êtes ni l'expéditeur ni le transporteur de cet envoi.",
  },
  UNKNOWN: {
    title: 'Lecture impossible',
    detail: 'Réessayez dans un instant.',
  },
};

function Line({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{String(value)}</Text>
    </View>
  );
}

export default function ScanLabelScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState<ScannedLabel | null>(null);
  const [error, setError] = useState<LabelScanError | null>(null);
  // Un QR dans le champ déclenche onBarcodeScanned en continu : sans ce
  // verrou, une seule visée lancerait des dizaines d'appels réseau.
  const locked = useRef(false);

  const reset = () => {
    locked.current = false;
    setLabel(null);
    setError(null);
  };

  const onScan = useCallback(async ({ data }: { data: string }) => {
    if (locked.current) return;
    const parsed = parseLabelUrl(data);
    if (!parsed) return; // QR étranger à THL : on continue de viser.
    locked.current = true;
    setBusy(true);
    try {
      if (!IS_LIVE) throw new LabelError('UNKNOWN');
      setLabel(await resolveLabel(parsed.shipmentId, parsed.token));
      setError(null);
    } catch (e) {
      setError(e instanceof LabelError ? e.code : 'UNKNOWN');
      setLabel(null);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxxl }} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={44} color={COLORS.secondary} />
          <Text style={styles.title}>Accès à l'appareil photo</Text>
          <Text style={styles.detail}>
            THL a besoin de l'appareil photo pour lire le QR code d'une étiquette. Aucune photo
            n'est enregistrée ni envoyée.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Autoriser</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (label || error) {
    const msg = error ? MESSAGES[error] : null;
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {msg ? (
            <Card style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={30} color={COLORS.danger} />
              <Text style={styles.title}>{msg.title}</Text>
              <Text style={styles.detail}>{msg.detail}</Text>
            </Card>
          ) : label ? (
            <>
              <Card>
                <Text style={styles.ref}>{label.reference}</Text>
                <Text style={styles.detail}>
                  {label.pickupAddress.city}, {label.pickupAddress.country} →{' '}
                  {label.deliveryAddress.city}, {label.deliveryAddress.country}
                </Text>
              </Card>

              <Card>
                <Text style={styles.section}>Expéditeur</Text>
                <Line label="Nom" value={label.senderName} />
                <Line label="Adresse" value={label.pickupAddress.street} />
                <Line
                  label="Ville"
                  value={`${label.pickupAddress.postalCode} ${label.pickupAddress.city}`}
                />
                <Line label="Contact" value={label.pickupAddress.contactPhone} />
              </Card>

              <Card>
                <Text style={styles.section}>Destinataire</Text>
                <Line label="Nom" value={label.deliveryAddress.contactName} />
                <Line label="Adresse" value={label.deliveryAddress.street} />
                <Line
                  label="Ville"
                  value={`${label.deliveryAddress.postalCode} ${label.deliveryAddress.city}`}
                />
                <Line label="Contact" value={label.deliveryAddress.contactPhone} />
              </Card>

              <Card>
                <Text style={styles.section}>Colis</Text>
                <Line label="Poids" value={label.weight ? `${label.weight} kg` : undefined} />
                <Line label="Description" value={label.description} />
                {(label.items ?? []).map((item, i) => (
                  <Line key={i} label={item.name} value={`×${item.quantity} · ${item.weight} kg`} />
                ))}
                <Line label="Transporteur" value={label.transporterName} />
              </Card>
            </>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Scanner une autre étiquette</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {busy ? 'Lecture…' : "Visez le QR code de l'étiquette"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  frame: {
    width: 230,
    height: 230,
    borderWidth: 3,
    borderColor: COLORS.white,
    borderRadius: RADIUS.lg,
    backgroundColor: 'transparent',
  },
  hint: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorCard: { alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  detail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  ref: { fontSize: 26, fontWeight: '800', letterSpacing: 2, color: COLORS.text, textAlign: 'center' },
  section: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, paddingVertical: 3 },
  lineLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  lineValue: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '800', fontSize: FONTS.sizes.md },
});
