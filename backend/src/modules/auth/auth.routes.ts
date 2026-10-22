import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { requestOtpSchema, verifyOtpSchema, refreshSchema } from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

// Throttle OTP requests to mitigate abuse of the SMS channel.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many OTP requests. Try again later.' } },
});

router.post('/otp/request', otpLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', validate(refreshSchema), authController.refresh);

export default router;
