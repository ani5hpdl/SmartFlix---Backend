const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/db");

const Movie = sequelize.define(
  "Movie",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    rating: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },

    totalRating: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },

    votes: {
      type: DataTypes.STRING(20), // e.g. "1.2M"
      allowNull: true,
    },

    ageRating: {
      type: DataTypes.STRING(10), // PG-13
      allowNull: true,
    },

    duration: {
      type: DataTypes.STRING(20), // "2h 46m"
      allowNull: true,
    },

    genres: {
      type: DataTypes.STRING(255), // "Action,Adventure,Sci-Fi"
      allowNull: true,
    },

    director: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    writers: {
      type: DataTypes.STRING(255), // "Frank Herbert, Jon Spaihts"
      allowNull: true,
    },

    revenue: {
      type: DataTypes.STRING(50), // "$650.00M"
      allowNull: true,
    },

    releaseDate: {
      type: DataTypes.STRING(50), // "March 1 2024"
      allowNull: true,
    },

    languages: {
      type: DataTypes.STRING(255), // "English, Arabic, Hindi"
      allowNull: true,
    },

    synopsis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    backdropUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "movies",
    timestamps: true,
  }
);

module.exports = Movie;
