import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    artistId: z.string().min(1),
    serviceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use date format YYYY-MM-DD'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use time format HH:mm'),
    address: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']),
  }),
});
