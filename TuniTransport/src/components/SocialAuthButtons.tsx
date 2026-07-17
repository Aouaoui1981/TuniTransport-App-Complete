// ──────────────────────────────────────────────────────────────────────────
// THL — Boutons de connexion sociale (Google / Apple / Facebook)
// Utilisés sur les écrans de connexion et d'inscription. La connexion réelle
// passe par Supabase OAuth (redirection sur le web).
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';
import { showAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../context/AuthContext';
import { OAuthProvider } from '../types';

const PROVIDERS: {
  key: OAuthProvider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'google', label: 'Continuer avec Google', icon: 'logo-google', color: '#DB4437' },
  { key: 'apple', label: 'Continuer avec Apple', icon: 'logo-apple', color: COLORS.text },
  { key: 'facebook', label: 'Continuer avec Facebook', icon: 'logo-facebook', color: '#1877F2' },
];

export default function SocialAuthButtons() {
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const onPress = async (provider: OAuthProvider) => {
    setBusy(provider);
    try {
      await signInWithProvider(provider);
      // Sur le web, la page redirige vers le provider : rien d'autre à faire.
    } catch (e) {
      showAlert('Connexion impossible', getErrorMessage(e));
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {PROVIDERS.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={styles.button}
          activeOpacity={0.8}
          disabled={busy !== null}
          onPress={() => onPress(p.key)}
          accessibilityRole="button"
          accessibilityLabel={p.label}
        >
          {busy === p.key ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <Ionicons name={p.icon} size={20} color={p.color} />
              <Text style={styles.label}>{p.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  label: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
});
