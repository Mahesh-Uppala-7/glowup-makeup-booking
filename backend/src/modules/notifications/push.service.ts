import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/apiError';

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/* Store (or move) an Expo push token for a user's device. */
export async function registerPushToken(userId: string, token: string, platform?: string) {
  if (!Expo.isExpoPushToken(token)) {
    throw ApiError.badRequest('Invalid Expo push token');
  }
  return prisma.pushToken.upsert({
    where: { token },
    update: { userId, platform },
    create: { userId, token, platform },
  });
}

export async function removePushToken(token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token } });
}

/**
 * Best-effort push delivery to all of a user's registered devices.
 * Never throws — notification failures must not break the core booking flow.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        // Prune tokens Expo reports as no longer registered.
        receipts.forEach((receipt, idx) => {
          if (
            receipt.status === 'error' &&
            receipt.details?.error === 'DeviceNotRegistered'
          ) {
            const bad = chunk[idx]?.to;
            if (typeof bad === 'string') void removePushToken(bad);
          }
        });
      } catch (err) {
        logger.error('Expo push chunk failed', err);
      }
    }
  } catch (err) {
    logger.error('sendPushToUser failed', err);
  }
}
