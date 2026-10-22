import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadPortfolioImage } from '../../middleware/upload';
import * as artistController from './artist.controller';

const router = Router();

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24h)');

const profileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(80),
    bio: z.string().max(600).optional(),
    experienceYears: z.number().int().min(0).max(70).optional(),
    city: z.string().max(80).optional(),
    address: z.string().max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
});

const servicesSchema = z.object({
  body: z.object({
    services: z
      .array(
        z.object({
          serviceId: z.string().min(1),
          price: z.number().int().positive(),
        }),
      )
      .min(1),
  }),
});

const availabilitySchema = z.object({
  body: z.object({
    slots: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: timeField,
          endTime: timeField,
        }),
      )
      .min(1),
  }),
});

// Public discovery
router.get('/', artistController.list);
router.get('/:id', artistController.getOne);
router.get('/:id/slots', artistController.getSlots);
router.get('/:id/portfolio', artistController.getPortfolio);

// Artist self-service (requires auth)
router.get('/me/profile', authenticate, artistController.getMyProfile);
router.put('/me/profile', authenticate, validate(profileSchema), artistController.upsertMyProfile);
router.put(
  '/me/services',
  authenticate,
  authorize(Role.ARTIST),
  validate(servicesSchema),
  artistController.setMyServices,
);
router.put(
  '/me/availability',
  authenticate,
  authorize(Role.ARTIST),
  validate(availabilitySchema),
  artistController.setMyAvailability,
);
router.post(
  '/me/portfolio',
  authenticate,
  authorize(Role.ARTIST),
  uploadPortfolioImage,
  artistController.uploadPortfolio,
);
router.delete(
  '/me/portfolio/:imageId',
  authenticate,
  authorize(Role.ARTIST),
  artistController.deletePortfolio,
);

export default router;
