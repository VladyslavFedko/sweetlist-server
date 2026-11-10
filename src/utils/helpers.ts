import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import type { User } from '../models/user';

export const currentUser = (req: Request): User => req.user as User;

export const parsedQuery = <T>(res: Response): T => res.locals.query as T;

export const pageMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const slugify = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export const newShareToken = (): string => randomBytes(16).toString('base64url');

export const isPremium = (user: User): boolean => !!user.premiumUntil && user.premiumUntil > new Date();

/** Best-effort removal of a previously uploaded file (stored as /uploads/<dir>/<name>). */
export async function removeUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return;
  const relative = url.replace('/uploads/', '');
  const base = path.resolve(env.UPLOAD_DIR);
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) return;
  await fs.unlink(target).catch(() => undefined);
}
