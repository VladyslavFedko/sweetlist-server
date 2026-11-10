import type { Request, Response } from 'express';
import { ShoppingItem, ShoppingListRecipe } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser, parsedQuery } from '../utils/helpers';
import { getReadableRecipe } from '../services/recipe.service';
import {
  buildShoppingView,
  clearList,
  confirmList,
  getOrCreateList,
  markDraft,
  productKey,
} from '../services/shopping.service';

export async function getShoppingList(req: Request, res: Response) {
  const { view } = parsedQuery<{ view: 'all' | 'recipes' | 'products' }>(res);
  const full = await buildShoppingView(currentUser(req).id);
  const { byRecipe, byProduct, ...rest } = full;
  res.json({
    data: {
      ...rest,
      ...(view !== 'products' && { byRecipe }),
      ...(view !== 'recipes' && { byProduct }),
    },
  });
}

/** Add a recipe to the list (or change its servings if it is already there). */
export async function addRecipe(req: Request, res: Response) {
  const user = currentUser(req);
  const { recipeId, servings } = req.body;
  const { recipe } = await getReadableRecipe(recipeId, user);
  const list = await getOrCreateList(user.id);

  const [entry, created] = await ShoppingListRecipe.findOrCreate({
    where: { shoppingListId: list.id, recipeId },
    defaults: { shoppingListId: list.id, recipeId, servings: servings ?? recipe.servings },
  });
  if (!created && servings) await entry.update({ servings });
  await markDraft(list);

  res.status(created ? 201 : 200).json({ data: await buildShoppingView(user.id) });
}

export async function updateRecipeEntry(req: Request, res: Response) {
  const user = currentUser(req);
  const list = await getOrCreateList(user.id);
  const entry = await ShoppingListRecipe.findOne({
    where: { shoppingListId: list.id, recipeId: req.params.recipeId as string },
  });
  if (!entry) throw AppError.notFound('Recipe in shopping list');
  await entry.update({ servings: req.body.servings });
  await markDraft(list);
  res.json({ data: await buildShoppingView(user.id) });
}

export async function removeRecipe(req: Request, res: Response) {
  const user = currentUser(req);
  const list = await getOrCreateList(user.id);
  const deleted = await ShoppingListRecipe.destroy({
    where: { shoppingListId: list.id, recipeId: req.params.recipeId as string },
  });
  if (!deleted) throw AppError.notFound('Recipe in shopping list');
  await markDraft(list);
  res.json({ data: await buildShoppingView(user.id) });
}

/** Mark a product as bought and/or set a manual quantity (pencil icon). */
export async function upsertItem(req: Request, res: Response) {
  const user = currentUser(req);
  const { name, unit, purchased, quantityOverride } = req.body;
  const key = productKey(name, unit);

  const view = await buildShoppingView(user.id);
  const exists = view.byProduct.some((group) => group.items.some((p) => p.productKey === key));
  if (!exists) throw AppError.notFound('Product in shopping list');

  const list = await getOrCreateList(user.id);
  const [item] = await ShoppingItem.findOrCreate({
    where: { shoppingListId: list.id, productKey: key },
    defaults: { shoppingListId: list.id, productKey: key },
  });
  await item.update({
    ...(purchased !== undefined && { purchased }),
    ...(quantityOverride !== undefined && { quantityOverride }),
  });
  await markDraft(list);
  res.json({ data: await buildShoppingView(user.id) });
}

export async function confirm(req: Request, res: Response) {
  const user = currentUser(req);
  await confirmList(user.id);
  res.json({ data: await buildShoppingView(user.id) });
}

export async function clear(req: Request, res: Response) {
  await clearList(currentUser(req).id);
  res.status(204).end();
}
