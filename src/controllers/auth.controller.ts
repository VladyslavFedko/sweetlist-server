import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { randomInt } from 'node:crypto';
import { User } from '../models';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { userView } from './serializers';

const BCRYPT_ROUNDS = 12;

async function uniqueUsername(email: string): Promise<string> {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20).padEnd(3, '0');
  let candidate = base;
  while (await User.count({ where: { username: candidate } })) {
    candidate = `${base}${randomInt(1000, 9999)}`;
  }
  return candidate;
}

export async function register(req: Request, res: Response) {
  const { name, email, password, username, language } = req.body;

  if (await User.count({ where: { email } })) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  if (username && (await User.count({ where: { username } }))) {
    throw AppError.conflict('This username is already taken', 'USERNAME_TAKEN');
  }

  const user = await User.create({
    name,
    email,
    username: username ?? (await uniqueUsername(email)),
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    ...(language && { language }),
  });

  const created = await User.findByPk(user.id); // re-read through the default scope (no hash)
  res.status(201).json({ data: { user: userView(created as User), token: signToken(user.id) } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const withHash = await User.unscoped().findOne({ where: { email } });

  // Same error for unknown email and wrong password to avoid user enumeration.
  if (!withHash || !(await bcrypt.compare(password, withHash.passwordHash))) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const user = (await User.findByPk(withHash.id)) as User;
  res.json({ data: { user: userView(user), token: signToken(user.id) } });
}
