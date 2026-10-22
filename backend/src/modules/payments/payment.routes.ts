import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as paymentController from './payment.controller';

const router = Router();

const createOrderSchema = z.object({
  body: z.object({ bookingId: z.string().min(1) }),
});

const verifySchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

router.post('/order', authenticate, validate(createOrderSchema), paymentController.createOrder);
router.post('/verify', authenticate, validate(verifySchema), paymentController.verify);

// Razorpay server-to-server webhook (no auth; verified by signature).
router.post('/webhook', paymentController.webhook);

export default router;
