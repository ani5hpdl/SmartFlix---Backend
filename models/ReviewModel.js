const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/db");

const Review = sequelize.define(
    "Review",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      movie_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },

      review_text: {
        type: DataTypes.TEXT,
      },

      is_spoiler: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
        tableName : "reviews",
        timestamps : true
    }
);

module.exports = Review;
