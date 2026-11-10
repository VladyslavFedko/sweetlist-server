import { z } from 'zod';
import { INGREDIENT_UNITS } from '../models/ingredient';
import { uuid } from './common';

export const shoppingViewQuery = z.object({
  view: z.enum(['all', 'recipes', 'products']).default('all'),
});

export const addRecipeBody = z.object({
  recipeId: uuid,
  /** Defaults to the recipe's own number of servings. */
  servings: z.number().int().min(1).max(1000).optional(),
});

export const updateEntryBody = z.object({ servings: z.number().int().min(1).max(1000) });

export const entryParams = z.object({ recipeId: uuid });

/** Upsert of per-product state: bought flag and/or manual quantity (pencil icon in the design). */
export const itemBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    unit: z.enum(INGREDIENT_UNITS),
    purchased: z.boolean().optional(),
    /** null resets the quantity back to the computed value. */
    quantityOverride: z.number().min(0).max(1_000_000).nullable().optional(),
  })
  .refine((v) => v.purchased !== undefined || v.quantityOverride !== undefined, {
    message: 'Provide purchased and/or quantityOverride',
  });
