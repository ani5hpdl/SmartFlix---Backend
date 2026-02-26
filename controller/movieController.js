const Movie = require("../models/MovieModel");
const Review = require("../models/ReviewModel");
const User = require("../models/UserModel");
const { Op } = require("sequelize");


// ===============================
// GET ALL MOVIES (with reviews)
// ===============================
const getAllMovies = async (req, res) => {
  try {
    const movies = await Movie.findAll({
      include: [
        {
          model: Review,
          as: "reviews",
          attributes: ["id", "rating", "review_text", "is_spoiler"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Movies Fetched Successfully",
      data: movies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// ===============================
// FILTER MOVIES
// ===============================
const getFilteredMovies = async (req, res) => {
  try {
    const { genres, yearFrom, yearTo, minRating, maxRating } = req.query;
    const filter = {};

    // Genre filter
    if (genres) {
      const genreArray = genres.split(",");

      filter.genres = {
        [Op.and]: genreArray.map((g) => ({
          [Op.iLike]: `%${g.trim()}%`,
        })),
      };
    }

    // Year filter
    if (yearFrom || yearTo) {
      filter.year = {};
      if (yearFrom) filter.year[Op.gte] = Number(yearFrom);
      if (yearTo) filter.year[Op.lte] = Number(yearTo);
    }

    // Rating filter
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating[Op.gte] = Number(minRating);
      if (maxRating) filter.rating[Op.lte] = Number(maxRating);
    }

    const movies = await Movie.findAll({
      where: filter,
      include: [
        {
          model: Review,
          as: "reviews",
          attributes: ["id", "rating"],
        },
      ],
      order: [["year", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// ===============================
// GET MOVIE BY ID (with reviews + user)
// ===============================
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request!",
      });
    }

    const fetchMovie = await Movie.findByPk(id, {
      include: [
        {
          model: Review,
          as: "reviews",
          attributes: ["id", "rating", "review_text", "is_spoiler", "createdAt"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!fetchMovie) {
      return res.status(404).json({
        success: false,
        message: "Movie Not Available",
      });
    }

    // Optional: calculate average rating dynamically
    const reviews = fetchMovie.reviews;
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((acc, curr) => acc + curr.rating, 0) /
            reviews.length
          ).toFixed(1)
        : 0;

    return res.status(200).json({
      success: true,
      message: "Movie Fetched Successfully",
      averageRating: avgRating,
      totalReviews: reviews.length,
      data: fetchMovie,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while Fetching Movie!",
      error: error.message,
    });
  }
};

module.exports = {
  getAllMovies,
  getFilteredMovies,
  getMovieById,
};