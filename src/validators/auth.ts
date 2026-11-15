import { z } from 'zod';
import { LANGUAGES, THEMES } from '../models/user';

const email = z.string().trim().toLowerCase().email().max(255);
const password = z.string().min(4, 'Password must be at least 8 characters').max(72);
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, '3-30 characters: latin letters, digits and underscore');

export const registerBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    email,
    password,
    confirmPassword: z.string(),
    username: username.optional(),
    language: z.enum(LANGUAGES).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginBody = z.object({ email, password: z.string().min(1) });

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    email,
    username,
    bio: z.string().trim().max(200).nullable(),
    language: z.enum(LANGUAGES),
    theme: z.enum(THEMES),
    cloudSyncEnabled: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const deleteAccountBody = z.object({ password: z.string().min(1) });
