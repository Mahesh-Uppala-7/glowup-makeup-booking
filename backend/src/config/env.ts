import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    devMode: (process.env.OTP_DEV_MODE ?? 'true') === 'true',
  },

  sms: {
    // 'twilio' | 'msg91' | 'console' (console just logs, for dev)
    provider: (process.env.SMS_PROVIDER ?? 'console').toLowerCase(),
    senderName: process.env.SMS_SENDER_NAME ?? 'GlowUp',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    },
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY ?? '',
      senderId: process.env.MSG91_SENDER_ID ?? 'GLOWUP',
      // DLT-approved OTP template id (required by MSG91 in India)
      templateId: process.env.MSG91_TEMPLATE_ID ?? '',
    },
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    // Public base URL used to build absolute image URLs. Falls back to request host.
    publicUrl: process.env.PUBLIC_URL ?? '',
    maxFileSizeMb: parseInt(process.env.UPLOAD_MAX_MB ?? '5', 10),
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    get enabled(): boolean {
      return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    },
  },
};
