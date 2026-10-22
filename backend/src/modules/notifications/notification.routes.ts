import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as notificationController from './notification.controller';

const router = Router();

const tokenSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    platform: z.string().max(20).optional(),
  }),
});

const removeSchema = z.object({
  body: z.object({ token: z.string().min(10) }),
});

router.post('/token', authenticate, validate(tokenSchema), notificationController.registerToken);
router.delete('/token', authenticate, validate(removeSchema), notificationController.removeToken);

export default router;
