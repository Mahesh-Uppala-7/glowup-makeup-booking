import { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { sendPushToUser } from '../notifications/push.service';

const bookingInclude = {
  service: true,
  artist: { include: { user: { select: { name: true, mobile: true, avatarUrl: true } } } },
  customer: { select: { id: true, name: true, mobile: true } },
  payment: true,
} satisfies Prisma.BookingInclude;

/* Human-friendly date/time label for notifications. */
function whenLabel(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Create a PENDING booking after verifying the chosen slot is free.
 * Price is the artist's custom price for the service, falling back to the service base price.
 */
export async function createBooking(
  customerId: string,
  input: {
    artistId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    address?: string;
    notes?: string;
  },
) {
  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw ApiError.badRequest('Invalid date/time. Use date=YYYY-MM-DD and time=HH:mm.');
  }
  if (scheduledAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Cannot book a slot in the past');
  }

  const [artist, service, artistService] = await Promise.all([
    prisma.artistProfile.findUnique({ where: { id: input.artistId } }),
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.artistService.findUnique({
      where: { artistId_serviceId: { artistId: input.artistId, serviceId: input.serviceId } },
    }),
  ]);

  if (!artist) throw ApiError.notFound('Artist not found');
  if (!service) throw ApiError.notFound('Service not found');

  const price = artistService?.price ?? service.basePrice;
  const durationMin = service.durationMin;
  const slotEnd = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);

  // Reject if the requested window overlaps an existing active booking for this artist.
  const conflict = await prisma.booking.findFirst({
    where: {
      artistId: input.artistId,
      status: { not: BookingStatus.CANCELLED },
      scheduledAt: { lt: slotEnd },
      AND: [
        {
          scheduledAt: {
            gte: new Date(scheduledAt.getTime() - 12 * 60 * 60 * 1000),
          },
        },
      ],
    },
    select: { scheduledAt: true, durationMin: true },
  });

  if (conflict) {
    const cStart = conflict.scheduledAt.getTime();
    const cEnd = cStart + conflict.durationMin * 60 * 1000;
    if (scheduledAt.getTime() < cEnd && slotEnd.getTime() > cStart) {
      throw ApiError.conflict('That time slot is no longer available. Please pick another.');
    }
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      artistId: input.artistId,
      serviceId: input.serviceId,
      scheduledAt,
      durationMin,
      amount: price,
      address: input.address,
      notes: input.notes,
      status: BookingStatus.PENDING,
    },
    include: bookingInclude,
  });

  // Notify the artist of the new request (best-effort).
  void sendPushToUser(artist.userId, {
    title: 'New booking request 💄',
    body: `${booking.service.name} on ${whenLabel(booking.scheduledAt)}`,
    data: { type: 'BOOKING_CREATED', bookingId: booking.id },
  });

  return booking;
}

export async function listCustomerBookings(customerId: string) {
  return prisma.booking.findMany({
    where: { customerId },
    include: bookingInclude,
    orderBy: { scheduledAt: 'desc' },
  });
}

export async function listArtistBookings(userId: string) {
  const artist = await prisma.artistProfile.findUnique({ where: { userId } });
  if (!artist) throw ApiError.badRequest('Create your artist profile first');
  return prisma.booking.findMany({
    where: { artistId: artist.id },
    include: bookingInclude,
    orderBy: { scheduledAt: 'desc' },
  });
}

export async function getBooking(bookingId: string, requesterId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ...bookingInclude, artist: { include: { user: true } } },
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  const isCustomer = booking.customerId === requesterId;
  const isArtist = booking.artist.user.id === requesterId;
  if (!isCustomer && !isArtist) throw ApiError.forbidden();
  return booking;
}

export async function cancelBooking(bookingId: string, requesterId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { artist: true },
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.customerId !== requesterId && booking.artist.userId !== requesterId) {
    throw ApiError.forbidden();
  }
  if (booking.status === BookingStatus.COMPLETED) {
    throw ApiError.badRequest('Completed bookings cannot be cancelled');
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED },
    include: bookingInclude,
  });

  // Notify the other party about the cancellation.
  const cancelledByCustomer = booking.customerId === requesterId;
  const notifyUserId = cancelledByCustomer ? booking.artist.userId : booking.customerId;
  void sendPushToUser(notifyUserId, {
    title: 'Booking cancelled',
    body: `${updated.service.name} on ${whenLabel(updated.scheduledAt)} was cancelled`,
    data: { type: 'BOOKING_CANCELLED', bookingId: updated.id },
  });

  return updated;
}

/* Artist-only status transitions (confirm / start / complete). */
export async function updateStatus(
  bookingId: string,
  userId: string,
  status: BookingStatus,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { artist: true },
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.artist.userId !== userId) throw ApiError.forbidden();
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: bookingInclude,
  });

  const label: Record<string, string> = {
    CONFIRMED: 'confirmed ✅',
    IN_PROGRESS: 'in progress 💫',
    COMPLETED: 'completed 🎉',
  };
  void sendPushToUser(updated.customerId, {
    title: 'Booking update',
    body: `Your ${updated.service.name} booking is ${label[status] ?? status.toLowerCase()}`,
    data: { type: 'BOOKING_STATUS', bookingId: updated.id, status },
  });

  return updated;
}
