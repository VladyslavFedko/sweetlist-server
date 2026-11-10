import type { Request, Response } from 'express';
import { RecipeShare } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser } from '../utils/helpers';
import { getOwnedRecipe } from '../services/recipe.service';
import { findUserByIdentifier } from './user.controller';

const sharedWithInclude = [
  { association: 'sharedWith', attributes: ['id', 'name', 'username', 'avatarUrl'] },
];

export async function listShares(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const shares = await RecipeShare.findAll({
    where: { recipeId: recipe.id },
    include: sharedWithInclude,
    order: [['createdAt', 'DESC']],
  });
  res.json({ data: shares });
}

/** "Надати доступ": share with a user found by email or @username. */
export async function createShare(req: Request, res: Response) {
  const user = currentUser(req);
  const recipe = await getOwnedRecipe(req.params.recipeId as string, user);

  const target = await findUserByIdentifier(req.body.identifier);
  if (!target) throw AppError.notFound('User');
  if (target.id === user.id) throw AppError.badRequest('You cannot share a recipe with yourself');

  const [share, created] = await RecipeShare.findOrCreate({
    where: { recipeId: recipe.id, sharedWithUserId: target.id },
  });
  const full = await RecipeShare.findByPk(share.id, { include: sharedWithInclude });
  res.status(created ? 201 : 200).json({ data: full });
}

/** Owner revokes access for a given user. */
export async function revokeShare(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const deleted = await RecipeShare.destroy({
    where: { recipeId: recipe.id, sharedWithUserId: req.params.userId as string },
  });
  if (!deleted) throw AppError.notFound('Share');
  res.status(204).end();
}

/** A recipient removes a recipe from their "received" list. */
export async function leaveShare(req: Request, res: Response) {
  const deleted = await RecipeShare.destroy({
    where: { recipeId: req.params.recipeId as string, sharedWithUserId: currentUser(req).id },
  });
  if (!deleted) throw AppError.notFound('Share');
  res.status(204).end();
}
