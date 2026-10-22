import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { portfolioFileUrl } from '../../middleware/upload';
import * as artistService from './artist.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = req.query.serviceId as string | undefined;
  const city = req.query.city as string | undefined;
  const search = req.query.search as string | undefined;
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
  const radiusKm = req.query.radius !== undefined ? Number(req.query.radius) : undefined;

  if ((lat !== undefined && Number.isNaN(lat)) || (lng !== undefined && Number.isNaN(lng))) {
    throw ApiError.badRequest('lat and lng must be valid numbers');
  }

  const artists = await artistService.listArtists({
    serviceId,
    city,
    search,
    lat,
    lng,
    radiusKm: radiusKm && !Number.isNaN(radiusKm) ? radiusKm : undefined,
  });
  return sendSuccess(res, artists);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const artist = await artistService.getArtist(req.params.id);
  return sendSuccess(res, artist);
});

export const getSlots = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  if (!date) throw ApiError.badRequest('Query param "date" (YYYY-MM-DD) is required');
  const serviceId = req.query.serviceId as string | undefined;
  const result = await artistService.getAvailableSlots(req.params.id, date, serviceId);
  return sendSuccess(res, result);
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await artistService.getArtistByUserId(req.user!.sub);
  if (!profile) throw ApiError.notFound('You have not created an artist profile yet');
  return sendSuccess(res, profile);
});

export const upsertMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await artistService.upsertMyProfile(req.user!.sub, req.body);
  return sendSuccess(res, profile);
});

export const setMyServices = asyncHandler(async (req: Request, res: Response) => {
  const profile = await artistService.setMyServices(req.user!.sub, req.body.services);
  return sendSuccess(res, profile);
});

export const setMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const profile = await artistService.setMyAvailability(req.user!.sub, req.body.slots);
  return sendSuccess(res, profile);
});

export const getPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const images = await artistService.listPortfolio(req.params.id);
  return sendSuccess(res, images);
});

export const uploadPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) throw ApiError.badRequest('No image provided (use form field "image")');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = portfolioFileUrl(baseUrl, file.filename);
  const image = await artistService.addPortfolioImage(req.user!.sub, {
    url,
    caption: typeof req.body?.caption === 'string' ? req.body.caption : undefined,
  });
  return sendSuccess(res, image, 201);
});

export const deletePortfolio = asyncHandler(async (req: Request, res: Response) => {
  const result = await artistService.deletePortfolioImage(req.user!.sub, req.params.imageId);
  return sendSuccess(res, result);
});
