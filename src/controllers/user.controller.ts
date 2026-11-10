import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Recipe, User } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser, removeUploadedFile } from '../utils/helpers';
import { userView } from './serializers';

const PREMIUM_DAYS = 30;

export async function getMe(req: Request, res: Response) {
  res.json({ data: userView(currentUser(req)) });
}

export async function updateMe(req: Request, res: Response) {
  const user = currentUser(req);
  const { email, username } = req.body;

  if (email && email !== user.email && (await User.count({ where: { email } }))) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  if (username && username !== user.username && (await User.count({ where: { username } }))) {
    throw AppError.conflict('This username is already taken', 'USERNAME_TAKEN');
  }

  await user.update(req.body);
  res.json({ data: userView(user) });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const withHash = await User.unscoped().findByPk(currentUser(req).id);
  if (!withHash || !(await bcrypt.compare(currentPassword, withHash.passwordHash))) {
    throw AppError.badRequest('Current password is incorrect');
  }
  await withHash.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
  res.status(204).end();
}

export async function deleteMe(req: Request, res: Response) {
  const user = currentUser(req);
  const withHash = await User.unscoped().findByPk(user.id);
  if (!withHash || !(await bcrypt.compare(req.body.password, withHash.passwordHash))) {
    throw AppError.badRequest('Password is incorrect');
  }
  await removeUploadedFile(user.avatarUrl);
  await user.destroy(); // recipes, shares and the shopping list are removed by ON DELETE CASCADE
  res.status(204).end();
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('Attach an image in the "avatar" field');
  const user = currentUser(req);
  const previous = user.avatarUrl;
  await user.update({ avatarUrl: `/uploads/avatars/${req.file.filename}` });
  await removeUploadedFile(previous);
  res.json({ data: userView(user) });
}

export async function deleteAvatar(req: Request, res: Response) {
  const user = currentUser(req);
  const previous = user.avatarUrl;
  await user.update({ avatarUrl: null });
  await removeUploadedFile(previous);
  res.json({ data: userView(user) });
}

/**
 * Premium activation is mocked for the coursework: there is no payment provider.
 * Swap this for a webhook from Stripe/LiqPay/etc. in a real deployment.
 */
export async function activatePremium(req: Request, res: Response) {
  const user = currentUser(req);
  const from = user.isPremium && user.premiumUntil ? user.premiumUntil : new Date();
  await user.update({ premiumUntil: new Date(from.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000) });
  res.json({ data: userView(user) });
}

export async function cancelPremium(req: Request, res: Response) {
  const user = currentUser(req);
  await user.update({ premiumUntil: null });
  // Catalog publications of a former Premium user are hidden again, not deleted.
  await Recipe.update({ isPublished: false, publishedAt: null }, { where: { authorId: user.id, isPublished: true } });
  res.json({ data: userView(user) });
}

/** Lookup used by the share dialog to confirm a recipient exists ("email або @username"). */
export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const value = identifier.trim().toLowerCase();
  return User.findOne({
    where: value.startsWith('@') ? { username: value.slice(1) } : { [Op.or]: [{ email: value }, { username: value }] },
  });
}
