import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as userService from './user.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.sub);
  return sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, avatarUrl } = req.body;
  const user = await userService.updateProfile(req.user!.sub, { name, email, avatarUrl });
  return sendSuccess(res, user);
});
