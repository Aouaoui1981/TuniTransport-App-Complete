// ──────────────────────────────────────────────────────────────────────────
// THL — cross-platform alert
// React Native's Alert.alert is a silent no-op on react-native-web. On web,
// alerts are routed to the in-app AppAlertHost (THL-styled dialog); the raw
// window.alert/confirm only remain as a last-resort fallback if the host is
// not mounted. Native keeps the platform Alert.
// ──────────────────────────────────────────────────────────────────────────
import { Alert, AlertButton, Platform } from 'react-native';

export interface PendingAlert {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

type AlertHandler = (alert: PendingAlert) => void;

let webHandler: AlertHandler | null = null;

/** Mounted by AppAlertHost — returns the cleanup for its useEffect. */
export function registerAlertHandler(handler: AlertHandler): () => void {
  webHandler = handler;
  return () => {
    if (webHandler === handler) webHandler = null;
  };
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  if (webHandler) {
    webHandler({ title, message, buttons });
    return;
  }

  // Fallback (host not mounted): keep the old browser dialogs.
  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
  if (window.confirm(text)) {
    confirmBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
