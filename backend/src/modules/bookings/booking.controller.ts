import { Request, Response } from 'express';
import { BookingStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as bookingService from './booking.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(req.user!.sub, req.body);
  return sendSuccess(res, booking, 201);
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listCustomerBookings(req.user!.sub);
  return sendSuccess(res, bookings);
});

export const listForArtist = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listArtistBookings(req.user!.sub);
  return sendSuccess(res, bookings);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBooking(req.params.id, req.user!.sub);
  return sendSuccess(res, booking);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user!.sub);
  return sendSuccess(res, booking);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateStatus(
    req.params.id,
    req.user!.sub,
    req.body.status as BookingStatus,
  );
  return sendSuccess(res, booking);
});
