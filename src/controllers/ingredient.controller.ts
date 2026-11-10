import type { Request, Response } from 'express';
import { Ingredient } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser } from '../utils/helpers';
import { getOwnedRecipe, getReadableRecipe } from '../services/recipe.service';

async function findIngredient(recipeId: string, ingredientId: string) {
  const ingredient = await Ingredient.findOne({ where: { id: ingredientId, recipeId } });
  if (!ingredient) throw AppError.notFound('Ingredient');
  return ingredient;
}

export async function listIngredients(req: Request, res: Response) {
  const { recipe } = await getReadableRecipe(req.params.recipeId as string, currentUser(req));
  res.json({ data: recipe.ingredients ?? [] });
}

export async function getIngredient(req: Request, res: Response) {
  await getReadableRecipe(req.params.recipeId as string, currentUser(req));
  res.json({ data: await findIngredient(req.params.recipeId as string, req.params.ingredientId as string) });
}

export async function createIngredient(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const last = (await Ingredient.max('position', { where: { recipeId: recipe.id } })) as number | null;
  const ingredient = await Ingredient.create({ ...req.body, recipeId: recipe.id, position: (last ?? -1) + 1 });
  res.status(201).json({ data: ingredient });
}

export async function updateIngredient(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const ingredient = await findIngredient(recipe.id, req.params.ingredientId as string);
  await ingredient.update(req.body);
  res.json({ data: ingredient });
}

export async function deleteIngredient(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const count = await Ingredient.count({ where: { recipeId: recipe.id } });
  if (count <= 1) throw AppError.conflict('A recipe must keep at least one ingredient', 'LAST_INGREDIENT');
  const ingredient = await findIngredient(recipe.id, req.params.ingredientId as string);
  await ingredient.destroy();
  res.status(204).end();
}
