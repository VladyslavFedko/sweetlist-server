import type { RequestHandler } from 'express';
import { User } from '../models/user';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';
import { isPremium } from '../utils/helpers';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
  const userId = verifyToken(header.slice(7));
  const user = await User.findByPk(userId);
  if (!user) throw AppError.unauthorized('User no longer exists');
  req.user = user;
  next();
};

export const requirePremium: RequestHandler = (req, _res, next) => {
  if (!req.user || !isPremium(req.user)) {
    throw AppError.forbidden('This feature requires a Premium subscription', 'PREMIUM_REQUIRED');
  }
  next();
};
