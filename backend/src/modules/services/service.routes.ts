import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as serviceController from './service.controller';

const router = Router();

const categoryEnum = z.enum([
  'BASIC',
  'PARTY',
  'BRIDAL',
  'ENGAGEMENT',
  'HAIR',
  'SPECIAL',
]);

const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(500).optional(),
    category: categoryEnum,
    basePrice: z.number().int().positive(),
    durationMin: z.number().int().positive().default(60),
    imageUrl: z.string().url().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(500).optional(),
    category: categoryEnum.optional(),
    basePrice: z.number().int().positive().optional(),
    durationMin: z.number().int().positive().optional(),
    imageUrl: z.string().url().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Public catalogue
router.get('/', serviceController.list);
router.get('/:id', serviceController.getOne);

// Admin management
router.post('/', authenticate, authorize(Role.ADMIN), validate(createSchema), serviceController.create);
router.patch('/:id', authenticate, authorize(Role.ADMIN), validate(updateSchema), serviceController.update);

export default router;
