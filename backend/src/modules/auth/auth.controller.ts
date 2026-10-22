import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as authService from './auth.service';

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile } = req.body;
  const result = await authService.requestOtp(mobile);
  return sendSuccess(
    res,
    {
      mobile: result.mobile,
      message: 'OTP sent successfully',
      ...(result.devCode ? { devCode: result.devCode } : {}),
    },
    200,
  );
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobile, code, name, role } = req.body;
  const result = await authService.verifyOtpAndLogin({
    rawMobile: mobile,
    code,
    name,
    role,
  });
  return sendSuccess(res, result, 200);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshTokens(refreshToken);
  return sendSuccess(res, tokens, 200);
});
