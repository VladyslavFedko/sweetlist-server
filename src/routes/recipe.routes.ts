import { Router } from 'express';
import {
  createRecipe,
  createShareLink,
  deletePhoto,
  deleteRecipe,
  getRecipe,
  listRecipesHandler,
  revokeShareLink,
  updateRecipe,
  uploadPhoto,
} from '../controllers/recipe.controller';
import {
  createIngredient,
  deleteIngredient,
  getIngredient,
  listIngredients,
  updateIngredient,
} from '../controllers/ingredient.controller';
import {
  createStep,
  deleteStep,
  getStep,
  listSteps,
  reorderSteps,
  updateStep,
} from '../controllers/step.controller';
import { createShare, leaveShare, listShares, revokeShare } from '../controllers/share.controller';
import { requireAuth } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { idParams } from '../validators/common';
import {
  createRecipeBody,
  ingredientInput,
  ingredientParams,
  recipeListQuery,
  recipeParams,
  reorderStepsBody,
  shareParams,
  shareRecipeBody,
  stepInput,
  stepParams,
  updateIngredientBody,
  updateRecipeBody,
  updateStepBody,
} from '../validators/recipe';

const router = Router();
const photoUpload = imageUpload('recipes', 10);

router.use(requireAuth);

// Recipes
router.get('/', validate({ query: recipeListQuery }), listRecipesHandler);
router.post('/', validate({ body: createRecipeBody }), createRecipe);
router.get('/:id', validate({ params: idParams }), getRecipe);
router.patch('/:id', validate({ params: idParams, body: updateRecipeBody }), updateRecipe);
router.delete('/:id', validate({ params: idParams }), deleteRecipe);
router.post('/:id/photo', validate({ params: idParams }), photoUpload.single('photo'), uploadPhoto);
router.delete('/:id/photo', validate({ params: idParams }), deletePhoto);

// Public link management (the unauthenticated read endpoint lives in routes/index.ts)
router.post('/:id/share-link', validate({ params: idParams }), createShareLink);
router.delete('/:id/share-link', validate({ params: idParams }), revokeShareLink);

// Ingredients
router.get('/:recipeId/ingredients', validate({ params: recipeParams }), listIngredients);
router.post('/:recipeId/ingredients', validate({ params: recipeParams, body: ingredientInput }), createIngredient);
router.get('/:recipeId/ingredients/:ingredientId', validate({ params: ingredientParams }), getIngredient);
router.patch(
  '/:recipeId/ingredients/:ingredientId',
  validate({ params: ingredientParams, body: updateIngredientBody }),
  updateIngredient,
);
router.delete('/:recipeId/ingredients/:ingredientId', validate({ params: ingredientParams }), deleteIngredient);

// Steps ("order" is declared before ":stepId" so it is not captured as an id)
router.get('/:recipeId/steps', validate({ params: recipeParams }), listSteps);
router.post('/:recipeId/steps', validate({ params: recipeParams, body: stepInput }), createStep);
router.put('/:recipeId/steps/order', validate({ params: recipeParams, body: reorderStepsBody }), reorderSteps);
router.get('/:recipeId/steps/:stepId', validate({ params: stepParams }), getStep);
router.patch('/:recipeId/steps/:stepId', validate({ params: stepParams, body: updateStepBody }), updateStep);
router.delete('/:recipeId/steps/:stepId', validate({ params: stepParams }), deleteStep);

// Sharing with users ("me" is declared before ":userId")
router.get('/:recipeId/shares', validate({ params: recipeParams }), listShares);
router.post('/:recipeId/shares', validate({ params: recipeParams, body: shareRecipeBody }), createShare);
router.delete('/:recipeId/shares/me', validate({ params: recipeParams }), leaveShare);
router.delete('/:recipeId/shares/:userId', validate({ params: shareParams }), revokeShare);

export default router;
