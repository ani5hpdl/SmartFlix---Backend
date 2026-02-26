const User = require("./User");
const Movie = require("./Movie");
const Review = require("./Review");

// ======================
// USER ↔ REVIEW
// ======================

// A user can write many reviews
User.hasMany(Review, {
  foreignKey: "user_id",
  as: "reviews",
  onDelete: "CASCADE",
});

// Each review belongs to one user
Review.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// ======================
// MOVIE ↔ REVIEW
// ======================

// A movie can have many reviews
Movie.hasMany(Review, {
  foreignKey: "movie_id",
  as: "reviews",
  onDelete: "CASCADE",
});

// Each review belongs to one movie
Review.belongsTo(Movie, {
  foreignKey: "movie_id",
  as: "movie",
});

module.exports = {
  User,
  Movie,
  Review,
};