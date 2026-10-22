import Razorpay from 'razorpay';
import { env } from './env';

/* Returns a configured Razorpay client, or null when keys are absent (dev/mock mode). */
export const razorpay = env.razorpay.enabled
  ? new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    })
  : null;
