import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationApi } from '../api';

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as Notifications.NotificationBehavior,
});

/**
 * Requests permission, obtains the Expo push token, and registers it with the API.
 * Safe no-op on web / simulators / when permission is denied.
 * Returns the token on success, otherwise null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // getExpoPushTokenAsync needs an EAS projectId in a standalone/dev build.
    // In Expo Go it resolves automatically; otherwise this throws and we bail gracefully.
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    try {
      await notificationApi.registerToken(token, Platform.OS);
    } catch {
      // Backend unreachable or not logged in yet — ignore.
    }
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await notificationApi.removeToken(token);
  } catch {
    // ignore
  }
}
