// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — consentement légal obligatoire
//
// <ConsentCheckbox />  : case à cocher générique (déclarations diverses).
// <LegalConsent />     : case d'acceptation des Conditions générales, des
//                        Objets interdits et de la Décharge de responsabilité.
// Étape bloquante pour l'expéditeur (publication d'un envoi) et pour le
// transporteur (offre ou prise en charge). La navigation vers les pages
// légales est déléguée via onOpenPage pour éviter un cycle d'imports avec
// AppNavigator.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';
import { LegalPageKey } from '../content/legal';

export function ConsentCheckbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onToggle}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={COLORS.white} /> : null}
      </View>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

export function LegalConsent({
  checked,
  onToggle,
  onOpenPage,
}: {
  checked: boolean;
  onToggle: () => void;
  onOpenPage: (page: LegalPageKey) => void;
}) {
  return (
    <View style={styles.wrap}>
      <ConsentCheckbox checked={checked} onToggle={onToggle}>
        J’ai lu et j’accepte les{' '}
        <Text style={styles.link} onPress={() => onOpenPage('terms')}>
          Conditions générales
        </Text>
        , la liste des{' '}
        <Text style={styles.link} onPress={() => onOpenPage('prohibited')}>
          Objets interdits
        </Text>{' '}
        et la{' '}
        <Text style={styles.link} onPress={() => onOpenPage('disclaimer')}>
          Décharge de responsabilité
        </Text>
        .
      </ConsentCheckbox>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  text: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  link: { color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
