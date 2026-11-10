import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { Recipe } from './recipe';
import type { User } from './user';

/** A recipe shared with a specific user ("Отримані від інших кондитерів"): read-only for the recipient. */
export class RecipeShare extends Model<InferAttributes<RecipeShare>, InferCreationAttributes<RecipeShare>> {
  declare id: CreationOptional<string>;
  declare recipeId: ForeignKey<Recipe['id']>;
  declare sharedWithUserId: ForeignKey<User['id']>;
  declare createdAt: CreationOptional<Date>;

  declare recipe?: NonAttribute<Recipe>;
  declare sharedWith?: NonAttribute<User>;
}

RecipeShare.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    sharedWithUserId: { type: DataTypes.UUID, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'recipe_shares',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['recipeId', 'sharedWithUserId'] }, { fields: ['sharedWithUserId'] }],
  },
);
