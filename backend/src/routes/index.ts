import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import serviceRoutes from '../modules/services/service.routes';
import artistRoutes from '../modules/artists/artist.routes';
import bookingRoutes from '../modules/bookings/booking.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import notificationRoutes from '../modules/notifications/notification.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ name: 'Makeup Booking API', version: 'v1', status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/artists', artistRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);

export default router;
