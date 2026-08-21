// ──────────────────────────────────────────────────────────────────────────
// THL — Boutons de connexion sociale (Google / Apple)
// Utilisés sur les écrans de connexion et d'inscription. La connexion réelle
// passe par Supabase OAuth (redirection sur le web). À activer plus tard.
// ──────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';
import { showAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../context/AuthContext';
import { OAuthProvider, UserRole } from '../types';

const PROVIDERS: {
  key: OAuthProvider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'google', label: 'Continuer avec Google', icon: 'logo-google', color: '#DB4437' },
  { key: 'apple', label: 'Continuer avec Apple', icon: 'logo-apple', color: COLORS.text },
];

// « Se connecter avec Apple » n'est proposé que sur iOS : le fournisseur Apple
// suppose un compte Apple Developer, et un bouton qui échoue à coup sûr est pire
// que pas de bouton du tout — sur Android il serait de surcroît inattendu.
// Le jour où l'app sort sur iOS, le bouton réapparaît sans changement de code.
const VISIBLE_PROVIDERS = PROVIDERS.filter((p) => p.key !== 'apple' || Platform.OS === 'ios');

/**
 * `preferredRole` : le rôle coché sur l'écran d'inscription. Il ne sert QUE
 * si le compte est créé à cette occasion — un compte Google déjà inscrit
 * garde le sien, et l'utilisateur en est averti plutôt que de se retrouver
 * silencieusement dans un rôle qu'il n'a pas choisi.
 *
 * `blocked` / `onBlockedPress` : sur l'écran d'inscription, un compte ne peut
 * naître qu'après acceptation des Conditions générales et de la Politique de
 * confidentialité. Ce garde-fou n'existait que sur le formulaire e-mail :
 * passer par Google créait un compte sans qu'aucun consentement n'ait été
 * donné, alors que ces textes fondent le statut d'intermédiaire technique,
 * la liste des objets interdits et la décharge de responsabilité. L'écran de
 * connexion, lui, ne passe rien : les comptes existants ont déjà accepté.
 */
export default function SocialAuthButtons({
  preferredRole,
  blocked = false,
  onBlockedPress,
}: {
  preferredRole?: UserRole;
  blocked?: boolean;
  onBlockedPress?: () => void;
}) {
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const onPress = async (provider: OAuthProvider) => {
    if (blocked) {
      onBlockedPress?.();
      return;
    }
    setBusy(provider);
    try {
      await signInWithProvider(provider, preferredRole);
      // Sur le web, la page redirige vers le provider : rien d'autre à faire.
    } catch (e) {
      showAlert('Connexion impossible', getErrorMessage(e));
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {VISIBLE_PROVIDERS.map((p) => (
        <TouchableOpacity
          key={p.key}
          style={[styles.button, blocked && styles.buttonBlocked]}
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
  // Grisé sans être inerte : la pression explique ce qui manque.
  buttonBlocked: { opacity: 0.5 },
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
