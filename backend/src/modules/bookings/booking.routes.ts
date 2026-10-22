import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBookingSchema, statusSchema } from './booking.validation';
import * as bookingController from './booking.controller';

const router = Router();

router.use(authenticate);

// Customer
router.post('/', validate(createBookingSchema), bookingController.create);
router.get('/', bookingController.listMine);
router.get('/artist', authorize(Role.ARTIST), bookingController.listForArtist);
router.get('/:id', bookingController.getOne);
router.patch('/:id/cancel', bookingController.cancel);

// Artist status transitions
router.patch(
  '/:id/status',
  authorize(Role.ARTIST),
  validate(statusSchema),
  bookingController.updateStatus,
);

export default router;
