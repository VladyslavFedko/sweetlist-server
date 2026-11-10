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

export class RecipeStep extends Model<InferAttributes<RecipeStep>, InferCreationAttributes<RecipeStep>> {
  declare id: CreationOptional<string>;
  declare recipeId: ForeignKey<Recipe['id']>;
  declare position: number;
  declare title: CreationOptional<string>;
  declare instruction: string;
}

RecipeStep.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    title: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    instruction: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, tableName: 'recipe_steps', timestamps: false, indexes: [{ fields: ['recipeId'] }] },
);
