// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — notifications service (STEP 5)
// ──────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { IS_LIVE } from './supabase';
import { savePushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse.data;

    if (IS_LIVE && userId && token) {
      await savePushToken(userId, token).catch(() => undefined);
    }
    return token;
  } catch {
    // Expo Go / simulators may not support push tokens — fail silently.
    return null;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null, // immediate
    });
  } catch {
    // no-op in unsupported environments
  }
}
