const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/db");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    verificationExpiresIn: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true
  }
);

module.exports = User