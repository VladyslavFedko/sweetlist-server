import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from 'sequelize';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const send = (status: number, code: string, message: string, details?: unknown) =>
    res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });

  if (err instanceof AppError) return send(err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    return send(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }

  if (err instanceof multer.MulterError) {
    return send(400, 'UPLOAD_ERROR', err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message);
  }

  if (err instanceof UniqueConstraintError) {
    return send(
      409,
      'CONFLICT',
      'A record with these values already exists',
      err.errors.map((e) => ({ path: e.path, message: e.message })),
    );
  }

  if (err instanceof ForeignKeyConstraintError) {
    return send(409, 'CONFLICT', 'The operation violates a relation with another record');
  }

  if (err instanceof SequelizeValidationError) {
    return send(
      400,
      'VALIDATION_ERROR',
      'Validation failed',
      err.errors.map((e) => ({ path: e.path, message: e.message })),
    );
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return send(400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  console.error(err);
  return send(
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production' ? 'Internal server error' : String(err?.message ?? err),
  );
};
