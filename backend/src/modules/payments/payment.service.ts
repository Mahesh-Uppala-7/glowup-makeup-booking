import crypto from 'node:crypto';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { razorpay } from '../../config/razorpay';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/apiError';
import { sendPushToUser } from '../notifications/push.service';

/**
 * Create (or reuse) a payment order for a booking.
 * Returns the data the client SDK/checkout needs. When Razorpay keys are not
 * configured, a mock order is returned so the full flow is testable offline.
 */
export async function createOrder(bookingId: string, requesterId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.customerId !== requesterId) throw ApiError.forbidden();
  if (booking.status === BookingStatus.CANCELLED) {
    throw ApiError.badRequest('Cannot pay for a cancelled booking');
  }
  if (booking.payment?.status === PaymentStatus.PAID) {
    throw ApiError.badRequest('This booking is already paid');
  }

  const amountPaise = booking.amount * 100; // Razorpay works in the smallest unit.

  if (!razorpay) {
    // ---- Mock mode (no Razorpay keys) ----
    const mockOrderId = `order_mock_${booking.id}`;
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: { amount: booking.amount, razorpayOrderId: mockOrderId, status: PaymentStatus.CREATED },
      create: {
        bookingId: booking.id,
        amount: booking.amount,
        razorpayOrderId: mockOrderId,
        status: PaymentStatus.CREATED,
      },
    });
    logger.warn('Razorpay not configured — returning a MOCK order.');
    return {
      mock: true,
      orderId: mockOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: null,
      bookingId: booking.id,
    };
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: booking.id,
    notes: { bookingId: booking.id },
  });

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: { amount: booking.amount, razorpayOrderId: order.id, status: PaymentStatus.CREATED },
    create: {
      bookingId: booking.id,
      amount: booking.amount,
      razorpayOrderId: order.id,
      status: PaymentStatus.CREATED,
    },
  });

  return {
    mock: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.razorpay.keyId,
    bookingId: booking.id,
  };
}

/**
 * Verify the checkout signature returned by the Razorpay SDK and, on success,
 * mark the payment PAID and the booking CONFIRMED.
 */
export async function verifyPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: input.razorpayOrderId },
    include: { booking: true },
  });
  if (!payment) throw ApiError.notFound('Payment order not found');

  const isMock = input.razorpayOrderId.startsWith('order_mock_');

  if (!isMock) {
    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');
    if (expected !== input.razorpaySignature) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw ApiError.badRequest('Payment signature verification failed');
    }
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.CONFIRMED },
    }),
  ]);

  // Notify both parties that the booking is paid & confirmed (best-effort).
  const full = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
    include: { artist: true, service: true },
  });
  if (full) {
    void sendPushToUser(full.customerId, {
      title: 'Payment successful 🎉',
      body: `Your ${full.service.name} booking is confirmed`,
      data: { type: 'PAYMENT_SUCCESS', bookingId: full.id },
    });
    void sendPushToUser(full.artist.userId, {
      title: 'Booking confirmed & paid',
      body: `${full.service.name} booking has been paid`,
      data: { type: 'BOOKING_PAID', bookingId: full.id },
    });
  }

  return { payment: updatedPayment, bookingId: payment.bookingId, status: 'PAID' };
}

/**
 * Handle Razorpay server-to-server webhooks (payment.captured / payment.failed).
 * Verifies the webhook signature against the raw request body.
 */
export async function handleWebhook(rawBody: Buffer, signature: string) {
  if (!env.razorpay.webhookSecret) {
    logger.warn('Razorpay webhook received but no webhook secret configured.');
    return { ignored: true };
  }
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  if (expected !== signature) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  const entity = event?.payload?.payment?.entity;
  if (!entity?.order_id) return { ignored: true };

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: entity.order_id },
  });
  if (!payment) return { ignored: true };

  if (event.event === 'payment.captured') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          razorpayPaymentId: entity.id,
          method: entity.method,
        },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CONFIRMED },
      }),
    ]);
    const full = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { artist: true, service: true },
    });
    if (full) {
      void sendPushToUser(full.customerId, {
        title: 'Payment successful 🎉',
        body: `Your ${full.service.name} booking is confirmed`,
        data: { type: 'PAYMENT_SUCCESS', bookingId: full.id },
      });
      void sendPushToUser(full.artist.userId, {
        title: 'Booking confirmed & paid',
        body: `${full.service.name} booking has been paid`,
        data: { type: 'BOOKING_PAID', bookingId: full.id },
      });
    }
  } else if (event.event === 'payment.failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, razorpayPaymentId: entity.id },
    });
  }

  return { ok: true };
}
