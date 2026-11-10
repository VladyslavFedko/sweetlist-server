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
import type { User } from './user';
import type { Ingredient } from './ingredient';
import type { RecipeStep } from './recipeStep';
import type { Tag } from './tag';
import type { RecipeShare } from './recipeShare';

export const SERVINGS_UNITS = ['portions', 'pieces'] as const;
export const STORAGE_MODES = ['local', 'cloud'] as const;
export type ServingsUnit = (typeof SERVINGS_UNITS)[number];
export type StorageMode = (typeof STORAGE_MODES)[number];

export class Recipe extends Model<InferAttributes<Recipe>, InferCreationAttributes<Recipe>> {
  declare id: CreationOptional<string>;
  declare authorId: ForeignKey<User['id']>;
  declare title: string;
  declare description: CreationOptional<string>;
  declare photoUrl: CreationOptional<string | null>;
  /** Active cooking time. */
  declare prepTimeMinutes: number;
  /** Passive time, e.g. "+ 8 hours in the fridge". */
  declare restTimeMinutes: CreationOptional<number>;
  declare servings: number;
  declare servingsUnit: CreationOptional<ServingsUnit>;
  declare storageMode: CreationOptional<StorageMode>;
  declare isPublished: CreationOptional<boolean>;
  declare publishedAt: CreationOptional<Date | null>;
  /** Random token for the public read-only link (null = link sharing disabled). */
  declare shareToken: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare author?: NonAttribute<User>;
  declare ingredients?: NonAttribute<Ingredient[]>;
  declare steps?: NonAttribute<RecipeStep[]>;
  declare tags?: NonAttribute<Tag[]>;
  declare shares?: NonAttribute<RecipeShare[]>;
}

Recipe.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    authorId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false, validate: { len: [1, 120] } },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    photoUrl: { type: DataTypes.STRING(500), allowNull: true },
    prepTimeMinutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    restTimeMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    servings: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    servingsUnit: { type: DataTypes.ENUM(...SERVINGS_UNITS), allowNull: false, defaultValue: 'portions' },
    storageMode: { type: DataTypes.ENUM(...STORAGE_MODES), allowNull: false, defaultValue: 'cloud' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    shareToken: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'recipes',
    indexes: [{ fields: ['authorId'] }, { fields: ['isPublished'] }],
  },
);
