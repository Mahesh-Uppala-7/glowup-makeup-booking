import { z } from 'zod';

const mobileField = z
  .string()
  .min(10, 'Mobile number is required')
  .transform((v) => v.replace(/\D/g, ''));

export const requestOtpSchema = z.object({
  body: z.object({
    mobile: mobileField,
    role: z.enum(['CUSTOMER', 'ARTIST']).optional(),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    mobile: mobileField,
    code: z.string().length(6, 'OTP must be 6 digits'),
    name: z.string().min(2).max(60).optional(),
    role: z.enum(['CUSTOMER', 'ARTIST']).optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10, 'refreshToken is required'),
  }),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
