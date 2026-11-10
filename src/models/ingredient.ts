import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { Recipe } from './recipe';

export const INGREDIENT_UNITS = ['g', 'kg', 'ml', 'l', 'pcs', 'tsp', 'tbsp', 'pinch'] as const;
/** Shopping list groups from the design: Молочні / Сухі / Яйця / Інше. */
export const INGREDIENT_CATEGORIES = ['dairy', 'dry', 'eggs', 'other'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export class Ingredient extends Model<InferAttributes<Ingredient>, InferCreationAttributes<Ingredient>> {
  declare id: CreationOptional<string>;
  declare recipeId: ForeignKey<Recipe['id']>;
  declare name: string;
  declare quantity: number;
  declare unit: CreationOptional<IngredientUnit>;
  declare category: CreationOptional<IngredientCategory>;
  declare position: number;
}

Ingredient.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { len: [1, 120] } },
    quantity: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: 0 } },
    unit: { type: DataTypes.ENUM(...INGREDIENT_UNITS), allowNull: false, defaultValue: 'g' },
    category: { type: DataTypes.ENUM(...INGREDIENT_CATEGORIES), allowNull: false, defaultValue: 'other' },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'ingredients', timestamps: false, indexes: [{ fields: ['recipeId'] }] },
);
