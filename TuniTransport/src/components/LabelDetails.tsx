// ──────────────────────────────────────────────────────────────────────────
// THL — affichage d'une étiquette résolue
//
// Partagé par le scanner intégré et par l'ouverture d'un lien d'étiquette
// (QR lu avec l'appareil photo du téléphone, qui ouvre le navigateur). Les
// deux chemins montrent exactement la même chose : ce que le serveur a bien
// voulu rendre, après avoir vérifié qui demande.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, FONTS } from '../utils/theme';
import { Card } from './index';
import { ScannedLabel, LabelScanError } from '../services/api';

export const LABEL_MESSAGES: Record<LabelScanError, { title: string; detail: string }> = {
  NOT_AUTHENTICATED: {
    title: 'Connexion requise',
    detail:
      "Cette étiquette ne révèle rien par elle-même. Connectez-vous avec le compte concerné pour en voir les détails.",
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

export function LabelError({ code }: { code: LabelScanError }) {
  const msg = LABEL_MESSAGES[code];
  return (
    <Card style={styles.errorCard}>
      <Ionicons name="alert-circle-outline" size={30} color={COLORS.danger} />
      <Text style={styles.title}>{msg.title}</Text>
      <Text style={styles.detail}>{msg.detail}</Text>
    </Card>
  );
}

export function LabelDetails({ label }: { label: ScannedLabel }) {
  return (
    <>
      <Card>
        <Text style={styles.ref}>{label.reference}</Text>
        <Text style={styles.detail}>
          {label.pickupAddress.city}, {label.pickupAddress.country} → {label.deliveryAddress.city},{' '}
          {label.deliveryAddress.country}
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
  );
}

const styles = StyleSheet.create({
  errorCard: { alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  detail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
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
});
