import type { Request, Response } from 'express';
import { Recipe } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser, newShareToken, pageMeta, parsedQuery, removeUploadedFile } from '../utils/helpers';
import { env } from '../config/env';
import {
  RecipeListQuery,
  createRecipe as createRecipeService,
  getOwnedRecipe,
  getReadableRecipe,
  getRecipeByShareToken,
  listRecipes,
  recipeView,
  updateRecipe as updateRecipeService,
} from '../services/recipe.service';

export async function listRecipesHandler(req: Request, res: Response) {
  const query = parsedQuery<RecipeListQuery>(res);
  const { rows, total } = await listRecipes(currentUser(req), query);
  const access = query.scope === 'mine' ? 'owner' : query.scope === 'received' ? 'shared' : 'catalog';
  res.json({
    data: rows.map((recipe) => recipeView(recipe, access)),
    meta: pageMeta(query.page, query.limit, total),
  });
}

export async function getRecipe(req: Request, res: Response) {
  const { recipe, access } = await getReadableRecipe(req.params.id as string, currentUser(req));
  res.json({ data: recipeView(recipe, access) });
}

export async function createRecipe(req: Request, res: Response) {
  const user = currentUser(req);
  const id = await createRecipeService(user, req.body);
  const { recipe, access } = await getReadableRecipe(id, user);
  res.status(201).json({ data: recipeView(recipe, access) });
}

export async function updateRecipe(req: Request, res: Response) {
  const user = currentUser(req);
  const recipe = await getOwnedRecipe(req.params.id as string, user);
  await updateRecipeService(user, recipe, req.body);
  const fresh = await getReadableRecipe(recipe.id, user);
  res.json({ data: recipeView(fresh.recipe, fresh.access) });
}

export async function deleteRecipe(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.id as string, currentUser(req));
  const photo = recipe.photoUrl;
  await recipe.destroy(); // ingredients, steps, shares, tag links and list entries cascade
  await removeUploadedFile(photo);
  res.status(204).end();
}

export async function uploadPhoto(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('Attach an image in the "photo" field');
  const user = currentUser(req);
  let recipe: Recipe;
  try {
    recipe = await getOwnedRecipe(req.params.id as string, user);
  } catch (err) {
    await removeUploadedFile(`/uploads/recipes/${req.file.filename}`); // do not keep orphaned uploads
    throw err;
  }
  const previous = recipe.photoUrl;
  await recipe.update({ photoUrl: `/uploads/recipes/${req.file.filename}` });
  await removeUploadedFile(previous);
  res.json({ data: { photoUrl: recipe.photoUrl } });
}

export async function deletePhoto(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.id as string, currentUser(req));
  const previous = recipe.photoUrl;
  await recipe.update({ photoUrl: null });
  await removeUploadedFile(previous);
  res.status(204).end();
}

// ---- public link ("Посилання для перегляду") ----

export async function createShareLink(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.id as string, currentUser(req));
  if (!recipe.shareToken) await recipe.update({ shareToken: newShareToken() });
  res.json({ data: { token: recipe.shareToken, url: `${env.WEB_URL}/r/${recipe.shareToken}` } });
}

export async function revokeShareLink(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.id as string, currentUser(req));
  await recipe.update({ shareToken: null });
  res.status(204).end();
}

/** Unauthenticated, read-only view of a recipe via its share link. */
export async function getSharedRecipe(req: Request, res: Response) {
  const recipe = await getRecipeByShareToken(req.params.token as string);
  res.json({ data: recipeView(recipe, 'shared') });
}
