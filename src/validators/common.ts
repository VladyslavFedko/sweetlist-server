import { z } from 'zod';

export const uuid = z.string().uuid();

export const idParams = z.object({ id: uuid });

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};
