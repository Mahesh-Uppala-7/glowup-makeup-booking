import { Response } from 'express';

interface Meta {
  [key: string]: unknown;
}

/* Standard success envelope so every client gets a predictable shape. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Meta,
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
