// ──────────────────────────────────────────────────────────────────────────
// THL — boîtes de dialogue de l'application
// Toutes les alertes passent par AppAlertHost, la boîte aux couleurs de THL,
// sur toutes les plateformes. La boîte système d'Android — grise, à angles
// vifs — jurait au milieu d'une interface sombre soignée, et l'application
// disposait déjà de sa propre boîte, jusqu'ici réservée au web.
// Replis, seulement si l'hôte n'est pas monté : Alert.alert en natif (où il
// fonctionne), window.alert/confirm sur le web (où Alert.alert est inerte).
// ──────────────────────────────────────────────────────────────────────────
import { Alert, AlertButton, Platform } from 'react-native';

export interface PendingAlert {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

type AlertHandler = (alert: PendingAlert) => void;

let host: AlertHandler | null = null;

/** Monté par AppAlertHost — renvoie le nettoyage pour son useEffect. */
export function registerAlertHandler(handler: AlertHandler): () => void {
  host = handler;
  return () => {
    if (host === handler) host = null;
  };
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (host) {
    host({ title, message, buttons });
    return;
  }

  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Repli web (hôte non monté) : boîtes du navigateur.
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
