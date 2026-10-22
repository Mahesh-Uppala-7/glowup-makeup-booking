import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import * as paymentService from './payment.service';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.body;
  const order = await paymentService.createOrder(bookingId, req.user!.sub);
  return sendSuccess(res, order, 201);
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const result = await paymentService.verifyPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return sendSuccess(res, result);
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody) throw ApiError.badRequest('Missing webhook signature or body');
  const result = await paymentService.handleWebhook(rawBody, signature);
  return sendSuccess(res, result);
});
