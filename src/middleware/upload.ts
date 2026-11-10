import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/** JPG/PNG upload to <UPLOAD_DIR>/<dir>. Recipe photos: 10 MB, avatars: 5 MB (as in the design). */
export const imageUpload = (dir: 'recipes' | 'avatars', maxMb: number) => {
  const target = path.resolve(env.UPLOAD_DIR, dir);
  fs.mkdirSync(target, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: target,
      filename: (_req, file, cb) =>
        cb(null, `${randomUUID()}${file.mimetype === 'image/png' ? '.png' : '.jpg'}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (['image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
      else cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only JPG and PNG images are allowed'));
    },
  });
};
