import { Router } from 'express';
import {
  addRecipe,
  clear,
  confirm,
  getShoppingList,
  removeRecipe,
  updateRecipeEntry,
  upsertItem,
} from '../controllers/shopping.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addRecipeBody,
  entryParams,
  itemBody,
  shoppingViewQuery,
  updateEntryBody,
} from '../validators/shopping';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: shoppingViewQuery }), getShoppingList);
router.delete('/', clear);
router.post('/confirm', confirm);

router.post('/recipes', validate({ body: addRecipeBody }), addRecipe);
router.patch('/recipes/:recipeId', validate({ params: entryParams, body: updateEntryBody }), updateRecipeEntry);
router.delete('/recipes/:recipeId', validate({ params: entryParams }), removeRecipe);

router.put('/items', validate({ body: itemBody }), upsertItem);

export default router;
