import { z } from 'zod';

export const tagBody = z.object({ name: z.string().trim().min(1).max(30) });

export const tagListQuery = z.object({
  q: z.string().trim().max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
