import type { Request, Response } from 'express';
import { RecipeStep, sequelize } from '../models';
import { AppError } from '../utils/AppError';
import { currentUser } from '../utils/helpers';
import { getOwnedRecipe, getReadableRecipe } from '../services/recipe.service';

async function findStep(recipeId: string, stepId: string) {
  const step = await RecipeStep.findOne({ where: { id: stepId, recipeId } });
  if (!step) throw AppError.notFound('Step');
  return step;
}

export async function listSteps(req: Request, res: Response) {
  const { recipe } = await getReadableRecipe(req.params.recipeId as string, currentUser(req));
  res.json({ data: recipe.steps ?? [] });
}

export async function getStep(req: Request, res: Response) {
  await getReadableRecipe(req.params.recipeId as string, currentUser(req));
  res.json({ data: await findStep(req.params.recipeId as string, req.params.stepId as string) });
}

export async function createStep(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const last = (await RecipeStep.max('position', { where: { recipeId: recipe.id } })) as number | null;
  const step = await RecipeStep.create({ ...req.body, recipeId: recipe.id, position: (last ?? -1) + 1 });
  res.status(201).json({ data: step });
}

export async function updateStep(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const step = await findStep(recipe.id, req.params.stepId as string);
  await step.update(req.body);
  res.json({ data: step });
}

export async function deleteStep(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const count = await RecipeStep.count({ where: { recipeId: recipe.id } });
  if (count <= 1) throw AppError.conflict('A recipe must keep at least one step', 'LAST_STEP');
  const step = await findStep(recipe.id, req.params.stepId as string);
  await sequelize.transaction(async (transaction) => {
    await step.destroy({ transaction });
    const rest = await RecipeStep.findAll({ where: { recipeId: recipe.id }, order: [['position', 'ASC']], transaction });
    for (const [position, s] of rest.entries()) if (s.position !== position) await s.update({ position }, { transaction });
  });
  res.status(204).end();
}

/** Drag-and-drop ordering from the editor: the body lists every step id in the new order. */
export async function reorderSteps(req: Request, res: Response) {
  const recipe = await getOwnedRecipe(req.params.recipeId as string, currentUser(req));
  const ids: string[] = req.body.ids;
  const steps = await RecipeStep.findAll({ where: { recipeId: recipe.id } });

  const known = new Set(steps.map((s) => s.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    throw AppError.badRequest('"ids" must contain every step of the recipe exactly once');
  }

  await sequelize.transaction(async (transaction) => {
    for (const [position, id] of ids.entries()) {
      await RecipeStep.update({ position }, { where: { id, recipeId: recipe.id }, transaction });
    }
  });
  const ordered = await RecipeStep.findAll({ where: { recipeId: recipe.id }, order: [['position', 'ASC']] });
  res.json({ data: ordered });
}
