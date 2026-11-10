import { Order } from 'sequelize';
import {
  Ingredient,
  Recipe,
  ShoppingItem,
  ShoppingList,
  ShoppingListRecipe,
  sequelize,
} from '../models';
import { INGREDIENT_CATEGORIES, IngredientCategory } from '../models/ingredient';
import { AppError } from '../utils/AppError';

const round = (n: number) => Math.round(n * 100) / 100;

/** Same product = same normalised name + unit. "Борошно" in two recipes is one line in the product view. */
export const productKey = (name: string, unit: string) =>
  `${name.trim().toLowerCase().replace(/\s+/g, ' ')}|${unit}`;

export async function getOrCreateList(userId: string): Promise<ShoppingList> {
  const [list] = await ShoppingList.findOrCreate({ where: { userId }, defaults: { userId } });
  return list;
}

const entryOrder: Order = [
  ['createdAt', 'ASC'],
  [{ model: Recipe, as: 'recipe' }, { model: Ingredient, as: 'ingredients' }, 'position', 'ASC'],
];

export async function buildShoppingView(userId: string) {
  const list = await getOrCreateList(userId);

  const entries = await ShoppingListRecipe.findAll({
    where: { shoppingListId: list.id },
    include: [{ model: Recipe, as: 'recipe', include: [{ model: Ingredient, as: 'ingredients' }] }],
    order: entryOrder,
  });
  const items = await ShoppingItem.findAll({ where: { shoppingListId: list.id } });
  const state = new Map(items.map((item) => [item.productKey, item]));

  // "За рецептами": every recipe with its ingredients scaled to the chosen servings.
  const byRecipe = entries.map((entry) => {
    const recipe = entry.recipe as Recipe;
    const factor = entry.servings / recipe.servings;
    const ingredients = (recipe.ingredients ?? []).map((ing) => {
      const key = productKey(ing.name, ing.unit);
      return {
        productKey: key,
        name: ing.name,
        unit: ing.unit,
        category: ing.category,
        quantity: round(ing.quantity * factor),
        purchased: state.get(key)?.purchased ?? false,
      };
    });
    return {
      recipeId: recipe.id,
      title: recipe.title,
      servings: entry.servings,
      servingsUnit: recipe.servingsUnit,
      ingredients,
    };
  });

  // "За продуктами": identical products are summed and grouped by category.
  interface Product {
    productKey: string;
    name: string;
    unit: string;
    category: IngredientCategory;
    computedQuantity: number;
    parts: { recipeId: string; title: string; quantity: number }[];
  }
  const merged = new Map<string, Product>();
  for (const recipe of byRecipe) {
    for (const ing of recipe.ingredients) {
      const product = merged.get(ing.productKey) ?? {
        productKey: ing.productKey,
        name: ing.name,
        unit: ing.unit,
        category: ing.category,
        computedQuantity: 0,
        parts: [],
      };
      product.computedQuantity += ing.quantity;
      product.parts.push({ recipeId: recipe.recipeId, title: recipe.title, quantity: ing.quantity });
      merged.set(ing.productKey, product);
    }
  }

  const products = [...merged.values()].map((p) => {
    const s = state.get(p.productKey);
    const computed = round(p.computedQuantity);
    return {
      ...p,
      computedQuantity: computed,
      quantity: s?.quantityOverride ?? computed,
      edited: s?.quantityOverride != null,
      purchased: s?.purchased ?? false,
    };
  });

  const byProduct = INGREDIENT_CATEGORIES.map((category) => ({
    category,
    items: products.filter((p) => p.category === category),
  })).filter((group) => group.items.length > 0);

  const purchased = products.filter((p) => p.purchased).length;
  return {
    status: list.status,
    confirmedAt: list.confirmedAt,
    summary: {
      recipes: byRecipe.length,
      uniqueProducts: products.length,
      purchased,
      remaining: products.length - purchased,
    },
    byRecipe,
    byProduct,
  };
}

/** Any change to the list re-opens it for editing. */
export async function markDraft(list: ShoppingList) {
  if (list.status !== 'draft') await list.update({ status: 'draft', confirmedAt: null });
}

export async function clearList(userId: string) {
  const list = await getOrCreateList(userId);
  await sequelize.transaction(async (transaction) => {
    await ShoppingListRecipe.destroy({ where: { shoppingListId: list.id }, transaction });
    await ShoppingItem.destroy({ where: { shoppingListId: list.id }, transaction });
    await list.update({ status: 'draft', confirmedAt: null }, { transaction });
  });
}

export async function confirmList(userId: string) {
  const list = await getOrCreateList(userId);
  const count = await ShoppingListRecipe.count({ where: { shoppingListId: list.id } });
  if (count === 0) throw AppError.badRequest('Add at least one recipe before confirming the list');
  await list.update({ status: 'confirmed', confirmedAt: new Date() });
}
