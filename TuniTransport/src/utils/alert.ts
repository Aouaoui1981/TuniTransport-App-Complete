// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — cross-platform alert
// React Native's Alert.alert is a silent no-op on react-native-web, which
// left every confirmation (logout, "coming soon" feedback, form errors…)
// dead in the browser. Same signature as Alert.alert; on web it falls back
// to window.alert / window.confirm.
// ──────────────────────────────────────────────────────────────────────────
import { Alert, AlertButton, Platform } from 'react-native';

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // window.confirm only offers OK/Cancel: OK triggers the first
  // non-cancel button, Cancel triggers the cancel button (if any).
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
  if (window.confirm(text)) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
