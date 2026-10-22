import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { sendOtpSms } from '../notifications/sms.service';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  normalizeMobile,
  isValidMobile,
} from '../../utils/otp';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Create and store a one-time password for the given mobile number.
 * In dev mode the plaintext code is returned so you can test without an SMS provider.
 */
export async function requestOtp(
  rawMobile: string,
): Promise<{ mobile: string; devCode?: string }> {
  const mobile = normalizeMobile(rawMobile);
  if (!isValidMobile(mobile)) {
    throw ApiError.badRequest('Please provide a valid 10-digit Indian mobile number');
  }

  const code = generateOtp(6);
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

  // Invalidate any previous unconsumed OTPs for this number.
  await prisma.otpVerification.updateMany({
    where: { mobile, consumed: false },
    data: { consumed: true },
  });

  await prisma.otpVerification.create({
    data: { mobile, codeHash, expiresAt },
  });

  // Deliver the code through the configured SMS provider (console/twilio/msg91).
  await sendOtpSms(mobile, code);

  // In dev mode also return the code so you can test without a real SMS provider.
  if (env.otp.devMode) {
    return { mobile, devCode: code };
  }

  return { mobile };
}

/**
 * Verify an OTP. On success, upsert the user and issue JWT tokens.
 * If the user does not exist yet, they are created with the requested role.
 */
export async function verifyOtpAndLogin(params: {
  rawMobile: string;
  code: string;
  name?: string;
  role?: 'CUSTOMER' | 'ARTIST';
}): Promise<{ user: unknown; tokens: AuthTokens; isNewUser: boolean }> {
  const mobile = normalizeMobile(params.rawMobile);
  if (!isValidMobile(mobile)) {
    throw ApiError.badRequest('Please provide a valid 10-digit Indian mobile number');
  }

  const otpRecord = await prisma.otpVerification.findFirst({
    where: { mobile, consumed: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    throw ApiError.badRequest('No active OTP found. Please request a new one.');
  }
  if (otpRecord.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('OTP has expired. Please request a new one.');
  }
  if (otpRecord.attempts >= env.otp.maxAttempts) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });
    throw ApiError.badRequest('Too many invalid attempts. Please request a new OTP.');
  }

  const isMatch = await verifyOtp(params.code, otpRecord.codeHash);
  if (!isMatch) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw ApiError.badRequest('Incorrect OTP. Please try again.');
  }

  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { consumed: true },
  });

  const existing = await prisma.user.findUnique({ where: { mobile } });
  const isNewUser = !existing;

  const user = await prisma.user.upsert({
    where: { mobile },
    update: { ...(params.name ? { name: params.name } : {}) },
    create: {
      mobile,
      name: params.name,
      role: (params.role as Role) ?? Role.CUSTOMER,
    },
    include: { artistProfile: true },
  });

  const tokens = issueTokens(user.id, user.role, user.mobile);
  return { user, tokens, isNewUser };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists');
  }
  return issueTokens(user.id, user.role, user.mobile);
}

function issueTokens(userId: string, role: Role, mobile: string): AuthTokens {
  return {
    accessToken: signAccessToken({ sub: userId, role, mobile }),
    refreshToken: signRefreshToken({ sub: userId }),
  };
}
