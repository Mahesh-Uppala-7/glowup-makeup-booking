import { env } from '../../config/env';
import { logger } from '../../config/logger';

/* eslint-disable @typescript-eslint/no-var-requires */

function buildOtpMessage(code: string): string {
  return `${code} is your ${env.sms.senderName} verification code. It is valid for ${env.otp.expiryMinutes} minutes. Do not share it with anyone.`;
}

async function sendViaTwilio(mobile: string, code: string): Promise<void> {
  const { accountSid, authToken, fromNumber } = env.sms.twilio;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio is not fully configured (SID/token/from number)');
  }
  // Lazy require so the SDK is only loaded when actually used.
  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);
  await client.messages.create({
    to: `+91${mobile}`,
    from: fromNumber,
    body: buildOtpMessage(code),
  });
}

async function sendViaMsg91(mobile: string, code: string): Promise<void> {
  const { authKey, templateId } = env.sms.msg91;
  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured (auth key / template id)');
  }
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
    templateId,
  )}&mobile=91${mobile}&otp=${code}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MSG91 request failed (${res.status}): ${text}`);
  }
}

/**
 * Send an OTP to a 10-digit Indian mobile number via the configured provider.
 * The 'console' provider just logs the code (useful in development).
 */
export async function sendOtpSms(mobile: string, code: string): Promise<void> {
  switch (env.sms.provider) {
    case 'twilio':
      await sendViaTwilio(mobile, code);
      logger.info(`OTP SMS sent via Twilio to ${mobile}`);
      return;
    case 'msg91':
      await sendViaMsg91(mobile, code);
      logger.info(`OTP SMS sent via MSG91 to ${mobile}`);
      return;
    default:
      logger.info(`[SMS console] ${mobile} -> ${code}`);
  }
}
