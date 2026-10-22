import { Platform } from 'react-native';

/**
 * Base URL of the backend API.
 *
 * - Web & iOS simulator: localhost works.
 * - Android emulator: 10.0.2.2 maps to the host machine's localhost.
 * - Physical device: replace with your computer's LAN IP, e.g. http://192.168.1.5:4000/api/v1
 *
 * You can also override this with the EXPO_PUBLIC_API_URL environment variable.
 */
const DEFAULT_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://localhost:4000/api/v1';

/**
 * Resolve the API base URL from EXPO_PUBLIC_API_URL.
 * Accepts either a full base ("https://host/api/v1") or just an origin
 * ("https://host") — the "/api/v1" suffix is appended automatically. This lets
 * hosting platforms inject only the service URL (e.g. Render's RENDER_EXTERNAL_URL).
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (!raw) return DEFAULT_API_URL;
  const trimmed = raw.replace(/\/+$/, '');
  return /\/api(\/|$)/.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
}

export const config = {
  apiBaseUrl: resolveApiBaseUrl(),
  // Razorpay publishable key id (test key). Only required for real web checkout.
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
  currency: 'INR',
};
