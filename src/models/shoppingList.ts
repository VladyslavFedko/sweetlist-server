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
import type { Recipe } from './recipe';

export const LIST_STATUSES = ['draft', 'confirmed'] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

/** One active shopping list per user. */
export class ShoppingList extends Model<InferAttributes<ShoppingList>, InferCreationAttributes<ShoppingList>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare status: CreationOptional<ListStatus>;
  declare confirmedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare entries?: NonAttribute<ShoppingListRecipe[]>;
  declare items?: NonAttribute<ShoppingItem[]>;
}

ShoppingList.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM(...LIST_STATUSES), allowNull: false, defaultValue: 'draft' },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'shopping_lists' },
);

/** A recipe added to the list, with the number of servings the user wants to cook. */
export class ShoppingListRecipe extends Model<
  InferAttributes<ShoppingListRecipe>,
  InferCreationAttributes<ShoppingListRecipe>
> {
  declare id: CreationOptional<string>;
  declare shoppingListId: ForeignKey<ShoppingList['id']>;
  declare recipeId: ForeignKey<Recipe['id']>;
  declare servings: number;
  declare createdAt: CreationOptional<Date>;

  declare recipe?: NonAttribute<Recipe>;
}

ShoppingListRecipe.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    shoppingListId: { type: DataTypes.UUID, allowNull: false },
    recipeId: { type: DataTypes.UUID, allowNull: false },
    servings: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'shopping_list_recipes',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['shoppingListId', 'recipeId'] }],
  },
);

/**
 * Per-product state. A product is identified by its normalised "name|unit" key, so the
 * "bought" flag and a manual quantity are shared by all recipes that use the same product.
 */
export class ShoppingItem extends Model<InferAttributes<ShoppingItem>, InferCreationAttributes<ShoppingItem>> {
  declare id: CreationOptional<string>;
  declare shoppingListId: ForeignKey<ShoppingList['id']>;
  declare productKey: string;
  declare purchased: CreationOptional<boolean>;
  declare quantityOverride: CreationOptional<number | null>;
}

ShoppingItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    shoppingListId: { type: DataTypes.UUID, allowNull: false },
    productKey: { type: DataTypes.STRING(200), allowNull: false },
    purchased: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    quantityOverride: { type: DataTypes.DOUBLE, allowNull: true, validate: { min: 0 } },
  },
  {
    sequelize,
    tableName: 'shopping_items',
    timestamps: false,
    indexes: [{ unique: true, fields: ['shoppingListId', 'productKey'] }],
  },
);
