import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export const uploadRoot = path.resolve(process.cwd(), env.uploads.dir);
const portfolioDir = path.join(uploadRoot, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, portfolioDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/* Accepts a single image file under the "image" form field. */
export const uploadPortfolioImage = multer({
  storage,
  limits: { fileSize: env.uploads.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only JPEG, PNG, WEBP or HEIC images are allowed'));
    }
  },
}).single('image');

/* Builds a public URL for an uploaded portfolio file. */
export function portfolioFileUrl(baseUrl: string, filename: string): string {
  const base = (env.uploads.publicUrl || baseUrl).replace(/\/$/, '');
  return `${base}/uploads/portfolio/${filename}`;
}
