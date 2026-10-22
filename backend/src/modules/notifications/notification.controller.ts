import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as pushService from './push.service';

export const registerToken = asyncHandler(async (req: Request, res: Response) => {
  const { token, platform } = req.body;
  const saved = await pushService.registerPushToken(req.user!.sub, token, platform);
  return sendSuccess(res, { id: saved.id }, 201);
});

export const removeToken = asyncHandler(async (req: Request, res: Response) => {
  await pushService.removePushToken(req.body.token);
  return sendSuccess(res, { removed: true });
});
