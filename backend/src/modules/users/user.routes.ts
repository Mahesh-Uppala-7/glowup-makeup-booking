import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as userController from './user.controller';

const router = Router();

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60).optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

router.use(authenticate);
router.get('/me', userController.getMe);
router.patch('/me', validate(updateMeSchema), userController.updateMe);

export default router;
