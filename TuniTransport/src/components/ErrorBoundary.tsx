// ──────────────────────────────────────────────────────────────────────────
// THL — Garde-fou d'affichage (Error Boundary).
// Capture les plantages de rendu React (que le suivi global ne voit pas),
// les envoie à Sentry (si configuré) et montre un écran de secours au lieu
// d'une page blanche. « Réessayer » recharge l'app.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';
import { captureError } from '../utils/monitoring';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error);
    // Trace locale utile en développement / logs plateforme.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  private reset = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={40} color={COLORS.danger} />
        </View>
        <Text style={styles.title}>Oups, une erreur est survenue</Text>
        <Text style={styles.text}>
          Un problème inattendu s'est produit. Vous pouvez réessayer — si cela persiste,
          contactez le support depuis votre profil.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.background,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
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
});
