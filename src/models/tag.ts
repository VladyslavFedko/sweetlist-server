import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Tag extends Model<InferAttributes<Tag>, InferCreationAttributes<Tag>> {
  declare id: CreationOptional<string>;
  declare name: string;
  /** Lower-cased, whitespace-normalised name used for uniqueness ("Торти" and "торти" are one tag). */
  declare slug: string;
}

Tag.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(30), allowNull: false, validate: { len: [1, 30] } },
    slug: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  },
  { sequelize, tableName: 'tags', timestamps: false },
);
