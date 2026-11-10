import { Router } from 'express';
import { getSharedRecipe } from '../controllers/recipe.controller';
import { validate } from '../middleware/validate';
import { tokenParams } from '../validators/recipe';
import authRoutes from './auth.routes';
import recipeRoutes from './recipe.routes';
import shoppingRoutes from './shopping.routes';
import tagRoutes from './tag.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/recipes', recipeRoutes);
router.use('/tags', tagRoutes);
router.use('/shopping-list', shoppingRoutes);

// Public, read-only recipe via share link (no auth).
router.get('/shared/:token', validate({ params: tokenParams }), getSharedRecipe);

export default router;
