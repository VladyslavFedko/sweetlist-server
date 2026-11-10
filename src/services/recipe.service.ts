import { Attributes, Includeable, Op, Order, Transaction, WhereOptions } from 'sequelize';
import { Ingredient, Recipe, RecipeShare, RecipeStep, RecipeTag, Tag, User, sequelize } from '../models';
import { AppError } from '../utils/AppError';
import { escapeLike, isPremium, slugify } from '../utils/helpers';
import type { z } from 'zod';
import type { createRecipeBody, recipeListQuery, updateRecipeBody } from '../validators/recipe';

export type CreateRecipeInput = z.infer<typeof createRecipeBody>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeBody>;
export type RecipeListQuery = z.infer<typeof recipeListQuery>;
export type RecipeAccess = 'owner' | 'shared' | 'catalog';

const authorInclude: Includeable = {
  model: User,
  as: 'author',
  attributes: ['id', 'name', 'username', 'avatarUrl'],
};
const tagsInclude: Includeable = {
  model: Tag,
  as: 'tags',
  attributes: ['id', 'name'],
  through: { attributes: [] },
};

export const fullInclude: Includeable[] = [
  authorInclude,
  tagsInclude,
  { model: Ingredient, as: 'ingredients' },
  { model: RecipeStep, as: 'steps' },
];

export const fullOrder: Order = [
  [{ model: Ingredient, as: 'ingredients' }, 'position', 'ASC'],
  [{ model: RecipeStep, as: 'steps' }, 'position', 'ASC'],
];

/** Fields the public link and recipients may see; internal fields (shareToken) stay with the owner. */
export function recipeView(recipe: Recipe, access: RecipeAccess) {
  const json = recipe.toJSON() as Record<string, unknown>;
  if (access !== 'owner') delete json.shareToken;
  return { ...json, access };
}

// ---------- access control ----------

async function accessFor(recipe: Recipe, user: User): Promise<RecipeAccess | null> {
  if (recipe.authorId === user.id) return 'owner';
  const shared = await RecipeShare.count({ where: { recipeId: recipe.id, sharedWithUserId: user.id } });
  if (shared > 0) return 'shared';
  if (recipe.isPublished && isPremium(user)) return 'catalog';
  return null;
}

/** Recipe with all relations for someone allowed to read it (owner, recipient, or Premium catalog reader). */
export async function getReadableRecipe(recipeId: string, user: User) {
  const recipe = await Recipe.findByPk(recipeId, { include: fullInclude, order: fullOrder });
  if (!recipe) throw AppError.notFound('Recipe');
  const access = await accessFor(recipe, user);
  if (!access) throw AppError.notFound('Recipe'); // do not reveal that it exists
  return { recipe, access };
}

/** Plain recipe row, only for its author. 403 if the user can read it but does not own it, 404 otherwise. */
export async function getOwnedRecipe(recipeId: string, user: User): Promise<Recipe> {
  const recipe = await Recipe.findByPk(recipeId);
  if (!recipe) throw AppError.notFound('Recipe');
  if (recipe.authorId === user.id) return recipe;
  if (await accessFor(recipe, user)) {
    throw AppError.forbidden('Only the author can change this recipe', 'NOT_RECIPE_OWNER');
  }
  throw AppError.notFound('Recipe');
}

export async function getRecipeByShareToken(token: string) {
  const recipe = await Recipe.findOne({ where: { shareToken: token }, include: fullInclude, order: fullOrder });
  if (!recipe) throw AppError.notFound('Recipe');
  return recipe;
}

// ---------- tags ----------

async function syncTags(recipeId: string, names: string[], transaction: Transaction) {
  const unique = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    if (slug && !unique.has(slug)) unique.set(slug, name.trim());
  }
  const tags: Tag[] = [];
  for (const [slug, name] of unique) {
    const [tag] = await Tag.findOrCreate({ where: { slug }, defaults: { name, slug }, transaction });
    tags.push(tag);
  }
  await RecipeTag.destroy({ where: { recipeId }, transaction });
  if (tags.length) {
    await RecipeTag.bulkCreate(
      tags.map((tag) => ({ recipeId, tagId: tag.id })),
      { transaction },
    );
  }
}

// ---------- queries ----------

export async function listRecipes(user: User, query: RecipeListQuery) {
  const { scope, q, tag, sort, page, limit } = query;
  const conditions: WhereOptions<Attributes<Recipe>>[] = [];
  const include: Includeable[] = [authorInclude, tagsInclude];

  if (scope === 'mine') {
    conditions.push({ authorId: user.id });
  } else if (scope === 'received') {
    include.push({
      model: RecipeShare,
      as: 'shares',
      where: { sharedWithUserId: user.id },
      required: true,
      attributes: ['createdAt'],
    });
  } else {
    if (!isPremium(user)) {
      throw AppError.forbidden('The published recipe catalog requires Premium', 'PREMIUM_REQUIRED');
    }
    conditions.push({ isPublished: true });
  }

  if (q) conditions.push({ title: { [Op.iLike]: `%${escapeLike(q)}%` } });

  if (tag) {
    const tagRow = await Tag.findOne({ where: { slug: slugify(tag) } });
    const rows = tagRow ? await RecipeTag.findAll({ where: { tagId: tagRow.id }, raw: true }) : [];
    const ids = rows.map((r) => (r as unknown as { recipeId: string }).recipeId);
    conditions.push({ id: { [Op.in]: ids } });
  }

  const order: Order = {
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    title: [['title', 'ASC']],
    time: [['prepTimeMinutes', 'ASC']],
  }[sort] as Order;

  const { rows, count } = await Recipe.findAndCountAll({
    where: { [Op.and]: conditions },
    include,
    order,
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return { rows, total: count };
}

// ---------- commands ----------

function assertCanPublish(user: User, wantsPublish: boolean | undefined) {
  if (wantsPublish && !isPremium(user)) {
    throw AppError.forbidden('Publishing recipes to the catalog requires Premium', 'PREMIUM_REQUIRED');
  }
}

export async function createRecipe(user: User, input: CreateRecipeInput): Promise<string> {
  assertCanPublish(user, input.isPublished);
  const { ingredients, steps, tags, ...fields } = input;

  return sequelize.transaction(async (transaction) => {
    const recipe = await Recipe.create(
      { ...fields, authorId: user.id, publishedAt: fields.isPublished ? new Date() : null },
      { transaction },
    );
    await Ingredient.bulkCreate(
      ingredients.map((item, position) => ({ ...item, recipeId: recipe.id, position })),
      { transaction },
    );
    await RecipeStep.bulkCreate(
      steps.map((step, position) => ({ ...step, recipeId: recipe.id, position })),
      { transaction },
    );
    await syncTags(recipe.id, tags, transaction);
    return recipe.id;
  });
}

export async function updateRecipe(user: User, recipe: Recipe, input: UpdateRecipeInput): Promise<void> {
  const { ingredients, steps, tags, ...fields } = input;
  if (fields.isPublished === true && !recipe.isPublished) assertCanPublish(user, true);

  await sequelize.transaction(async (transaction) => {
    const publishedAt =
      fields.isPublished === undefined
        ? undefined
        : fields.isPublished
          ? (recipe.publishedAt ?? new Date())
          : null;

    await recipe.update({ ...fields, ...(publishedAt !== undefined && { publishedAt }) }, { transaction });

    if (ingredients) {
      await Ingredient.destroy({ where: { recipeId: recipe.id }, transaction });
      await Ingredient.bulkCreate(
        ingredients.map((item, position) => ({ ...item, recipeId: recipe.id, position })),
        { transaction },
      );
    }
    if (steps) {
      await RecipeStep.destroy({ where: { recipeId: recipe.id }, transaction });
      await RecipeStep.bulkCreate(
        steps.map((step, position) => ({ ...step, recipeId: recipe.id, position })),
        { transaction },
      );
    }
    if (tags) await syncTags(recipe.id, tags, transaction);
  });
}
