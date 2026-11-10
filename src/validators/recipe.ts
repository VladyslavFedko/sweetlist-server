import { z } from 'zod';
import { INGREDIENT_CATEGORIES, INGREDIENT_UNITS } from '../models/ingredient';
import { SERVINGS_UNITS, STORAGE_MODES } from '../models/recipe';
import { pagination, uuid } from './common';

export const ingredientInput = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(1_000_000),
  unit: z.enum(INGREDIENT_UNITS).default('g'),
  category: z.enum(INGREDIENT_CATEGORIES).default('other'),
});

export const stepInput = z.object({
  title: z.string().trim().max(120).default(''),
  instruction: z.string().trim().min(1).max(2000),
});

const recipeFields = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(''),
  prepTimeMinutes: z.number().int().min(0).max(60 * 24 * 7),
  restTimeMinutes: z.number().int().min(0).max(60 * 24 * 30).default(0),
  servings: z.number().int().min(1).max(1000),
  servingsUnit: z.enum(SERVINGS_UNITS).default('portions'),
  storageMode: z.enum(STORAGE_MODES).default('cloud'),
  isPublished: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export const createRecipeBody = recipeFields.extend({
  ingredients: z.array(ingredientInput).min(1, 'Add at least one ingredient').max(100),
  steps: z.array(stepInput).min(1, 'Add at least one step').max(100),
});

/** PATCH: every field is optional; ingredients/steps/tags, when present, replace the whole collection. */
export const updateRecipeBody = recipeFields
  .partial()
  .extend({
    ingredients: z.array(ingredientInput).min(1).max(100).optional(),
    steps: z.array(stepInput).min(1).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const recipeListQuery = z.object({
  scope: z.enum(['mine', 'received', 'catalog']).default('mine'),
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(30).optional(),
  sort: z.enum(['newest', 'oldest', 'title', 'time']).default('newest'),
  ...pagination,
});

// Nested resources
export const recipeParams = z.object({ recipeId: uuid });
export const ingredientParams = z.object({ recipeId: uuid, ingredientId: uuid });
export const stepParams = z.object({ recipeId: uuid, stepId: uuid });
export const shareParams = z.object({ recipeId: uuid, userId: uuid });
export const tokenParams = z.object({ token: z.string().min(10).max(64) });

export const updateIngredientBody = ingredientInput
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const updateStepBody = stepInput
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const reorderStepsBody = z.object({ ids: z.array(uuid).min(1).max(100) });

export const shareRecipeBody = z.object({
  /** "name@example.com" or "@username" (as in the share dialog). */
  identifier: z.string().trim().min(2).max(255),
});
