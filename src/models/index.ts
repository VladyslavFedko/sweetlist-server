import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './user';
import { Recipe } from './recipe';
import { Ingredient } from './ingredient';
import { RecipeStep } from './recipeStep';
import { Tag } from './tag';
import { RecipeShare } from './recipeShare';
import { ShoppingItem, ShoppingList, ShoppingListRecipe } from './shoppingList';

/** Join table for Recipe <-> Tag (many-to-many). */
export const RecipeTag = sequelize.define(
  'RecipeTag',
  {
    recipeId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    tagId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  },
  { tableName: 'recipe_tags', timestamps: false },
);

// Author -> recipes
User.hasMany(Recipe, { foreignKey: 'authorId', as: 'recipes', onDelete: 'CASCADE' });
Recipe.belongsTo(User, { foreignKey: 'authorId', onDelete: 'CASCADE', as: 'author' });

// Recipe content
Recipe.hasMany(Ingredient, { foreignKey: 'recipeId', as: 'ingredients', onDelete: 'CASCADE' });
Ingredient.belongsTo(Recipe, { foreignKey: 'recipeId', onDelete: 'CASCADE', as: 'recipe' });
Recipe.hasMany(RecipeStep, { foreignKey: 'recipeId', as: 'steps', onDelete: 'CASCADE' });
RecipeStep.belongsTo(Recipe, { foreignKey: 'recipeId', onDelete: 'CASCADE', as: 'recipe' });

// Tags
Recipe.belongsToMany(Tag, { through: RecipeTag, foreignKey: 'recipeId', otherKey: 'tagId', as: 'tags' });
Tag.belongsToMany(Recipe, { through: RecipeTag, foreignKey: 'tagId', otherKey: 'recipeId', as: 'recipes' });

// Sharing
Recipe.hasMany(RecipeShare, { foreignKey: 'recipeId', as: 'shares', onDelete: 'CASCADE' });
RecipeShare.belongsTo(Recipe, { foreignKey: 'recipeId', onDelete: 'CASCADE', as: 'recipe' });
User.hasMany(RecipeShare, { foreignKey: 'sharedWithUserId', as: 'receivedShares', onDelete: 'CASCADE' });
RecipeShare.belongsTo(User, { foreignKey: 'sharedWithUserId', onDelete: 'CASCADE', as: 'sharedWith' });

// Shopping list
User.hasOne(ShoppingList, { foreignKey: 'userId', as: 'shoppingList', onDelete: 'CASCADE' });
ShoppingList.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE', as: 'user' });
ShoppingList.hasMany(ShoppingListRecipe, { foreignKey: 'shoppingListId', as: 'entries', onDelete: 'CASCADE' });
ShoppingListRecipe.belongsTo(ShoppingList, { foreignKey: 'shoppingListId', onDelete: 'CASCADE', as: 'shoppingList' });
ShoppingListRecipe.belongsTo(Recipe, { foreignKey: 'recipeId', onDelete: 'CASCADE', as: 'recipe' });
Recipe.hasMany(ShoppingListRecipe, { foreignKey: 'recipeId', as: 'listEntries', onDelete: 'CASCADE' });
ShoppingList.hasMany(ShoppingItem, { foreignKey: 'shoppingListId', as: 'items', onDelete: 'CASCADE' });
ShoppingItem.belongsTo(ShoppingList, { foreignKey: 'shoppingListId', onDelete: 'CASCADE', as: 'shoppingList' });

export {
  sequelize,
  User,
  Recipe,
  Ingredient,
  RecipeStep,
  Tag,
  RecipeShare,
  ShoppingList,
  ShoppingListRecipe,
  ShoppingItem,
};
