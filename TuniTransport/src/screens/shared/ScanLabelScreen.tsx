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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card } from '../../components';
import {
  LabelDetails,
  LabelError as LabelErrorCard,
  LABEL_MESSAGES as MESSAGES,
} from '../../components/LabelDetails';
import { parseLabelUrl } from '../../config/app';
import { IS_LIVE } from '../../services/supabase';
import {
  resolveLabel,
  confirmCollection,
  uploadShipmentPhoto,
  LabelError,
  ScannedLabel,
  LabelScanError,
} from '../../services/api';
import { showAlert } from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function ScanLabelScreen() {
  const { user } = useAuth();
  const { refresh } = useData();
  const [permission, requestPermission] = useCameraPermissions();
  const [confirming, setConfirming] = useState(false);
  const [scanned, setScanned] = useState<{ shipmentId: string; token: string } | null>(null);
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
    setScanned(null);
  };

  // La photo est obligatoire côté serveur aussi : c'est elle que verra
  // l'expéditeur, resté chez lui, et c'est elle qui tranchera un litige.
  const confirm = async () => {
    if (!label || !scanned || !user) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permission requise', "Autorisez l'appareil photo pour photographier le colis.");
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (shot.canceled || !shot.assets?.[0]) return;
    setConfirming(true);
    try {
      const url = await uploadShipmentPhoto(user.id, shot.assets[0].uri);
      await confirmCollection(scanned.shipmentId, scanned.token, url);
      await refresh();
      showAlert(
        'Prise en charge enregistrée',
        "L'expéditeur a été prévenu et voit votre photo dans le suivi."
      );
      reset();
    } catch (e) {
      const code = e instanceof LabelError ? e.code : 'UNKNOWN';
      showAlert(MESSAGES[code].title, MESSAGES[code].detail);
    } finally {
      setConfirming(false);
    }
  };

  const onScan = useCallback(async ({ data }: { data: string }) => {
    if (locked.current) return;
    const parsed = parseLabelUrl(data);
    if (!parsed) return; // QR étranger à THL : on continue de viser.
    locked.current = true;
    setBusy(true);
    setScanned(parsed);
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
          {msg ? <LabelErrorCard code={error!} /> : label ? <LabelDetails label={label} /> : null}

          {label &&
          label.viewerRole === 'transporter' &&
          (label.status === 'accepted' || label.status === 'dropped_off') ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }]}
              onPress={confirm}
              disabled={confirming}
            >
              <Text style={styles.primaryBtnText}>
                {confirming ? 'Enregistrement…' : 'Photographier et prendre en charge'}
              </Text>
            </TouchableOpacity>
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
