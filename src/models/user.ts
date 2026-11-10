import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';

export const LANGUAGES = ['uk', 'en'] as const;
export const THEMES = ['light', 'dark', 'system'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Theme = (typeof THEMES)[number];

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare username: string;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare bio: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare language: CreationOptional<Language>;
  declare theme: CreationOptional<Theme>;
  declare cloudSyncEnabled: CreationOptional<boolean>;
  declare lastSyncedAt: CreationOptional<Date | null>;
  declare premiumUntil: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  get isPremium(): NonAttribute<boolean> {
    return !!this.premiumUntil && this.premiumUntil > new Date();
  }
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: { is: /^[a-z0-9_]{3,30}$/ },
    },
    name: { type: DataTypes.STRING(100), allowNull: false, validate: { len: [1, 100] } },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    bio: { type: DataTypes.STRING(200), allowNull: true },
    avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
    language: { type: DataTypes.ENUM(...LANGUAGES), allowNull: false, defaultValue: 'uk' },
    theme: { type: DataTypes.ENUM(...THEMES), allowNull: false, defaultValue: 'system' },
    cloudSyncEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
    premiumUntil: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
    // The password hash never leaves the DB layer unless explicitly requested via User.unscoped().
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
  },
);
