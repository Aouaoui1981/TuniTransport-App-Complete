// ──────────────────────────────────────────────────────────────────────────
// THL — boîte de dialogue maison (remplace window.alert/confirm sur le web)
// showAlert (utils/alert) route ici quand l'hôte est monté : carte centrée
// aux couleurs THL, avec boutons default / cancel / destructive.
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import type { AlertButton } from 'react-native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../utils/theme';
import { registerAlertHandler, PendingAlert } from '../utils/alert';

export default function AppAlertHost() {
  const [alert, setAlert] = useState<PendingAlert | null>(null);

  useEffect(() => registerAlertHandler(setAlert), []);

  if (!alert) return null;

  const buttons: AlertButton[] =
    alert.buttons && alert.buttons.length > 0 ? alert.buttons : [{ text: 'OK' }];

  const press = (button: AlertButton) => {
    setAlert(null);
    button.onPress?.();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setAlert(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
          <View style={buttons.length > 2 ? styles.buttonsCol : styles.buttonsRow}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => press(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                    ]}
                  >
                    {button.text ?? 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  buttonsRow: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  buttonsCol: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  buttonDestructive: { backgroundColor: COLORS.danger },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },
  buttonTextCancel: { color: COLORS.text },
  buttonTextDestructive: { color: COLORS.white },
});
