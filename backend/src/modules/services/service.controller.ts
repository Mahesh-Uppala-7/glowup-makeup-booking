import { Request, Response } from 'express';
import { ServiceCategory } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as serviceService from './service.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const category = req.query.category as ServiceCategory | undefined;
  const search = req.query.search as string | undefined;
  const services = await serviceService.listServices({ category, search });
  return sendSuccess(res, services);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.getService(req.params.id);
  return sendSuccess(res, service);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.createService(req.body);
  return sendSuccess(res, service, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.updateService(req.params.id, req.body);
  return sendSuccess(res, service);
});
