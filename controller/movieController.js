const Movie = require("../models/MovieModel");
const Review = require("../models/ReviewModel");
const User = require("../models/UserModel");
const { Op } = require("sequelize");

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 30;
const MIN_YEAR = 1888;
const MAX_YEAR = new Date().getFullYear() + 1;

const safeInt = (value, fallback = null) => {
  const num = Number(value);
  return Number.isInteger(num) ? num : fallback;
};

const safeFloat = (value, fallback = null) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const sanitizeToken = (value = "") =>
  String(value).replace(/[^a-zA-Z0-9\s\-&]/g, "").trim();

const parsePagination = (query) => {
  const page = Math.max(1, safeInt(query.page, 1));
  const requestedLimit = safeInt(query.limit, DEFAULT_PAGE_SIZE);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const movieIncludes = [
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
];


// ===============================
// GET ALL MOVIES (with reviews)
// ===============================
const getAllMovies = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const { rows: movies, count } = await Movie.findAndCountAll({
      include: movieIncludes,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: "Movies Fetched Successfully",
      data: movies,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("getAllMovies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};


// ===============================
// FILTER MOVIES
// ===============================
const getFilteredMovies = async (req, res) => {
  try {
    const { genres, yearFrom, yearTo, minRating, maxRating } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const filter = {};

    // Genre filter
    if (genres) {
      const genreArray = genres
        .split(",")
        .map((genre) => sanitizeToken(genre))
        .filter(Boolean)
        .slice(0, 10);

      if (!genreArray.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid genres filter",
        });
      }

      filter.genres = {
        [Op.and]: genreArray.map((g) => ({
          [Op.iLike]: `%${g.trim()}%`,
        })),
      };
    }

    // Year filter
    const parsedYearFrom = safeInt(yearFrom);
    const parsedYearTo = safeInt(yearTo);
    if (parsedYearFrom || parsedYearTo) {
      filter.year = {};
      if (parsedYearFrom) {
        if (parsedYearFrom < MIN_YEAR || parsedYearFrom > MAX_YEAR) {
          return res.status(400).json({
            success: false,
            message: `yearFrom must be between ${MIN_YEAR} and ${MAX_YEAR}`,
          });
        }
        filter.year[Op.gte] = parsedYearFrom;
      }
      if (parsedYearTo) {
        if (parsedYearTo < MIN_YEAR || parsedYearTo > MAX_YEAR) {
          return res.status(400).json({
            success: false,
            message: `yearTo must be between ${MIN_YEAR} and ${MAX_YEAR}`,
          });
        }
        filter.year[Op.lte] = parsedYearTo;
      }
      if (
        Number.isInteger(parsedYearFrom) &&
        Number.isInteger(parsedYearTo) &&
        parsedYearFrom > parsedYearTo
      ) {
        return res.status(400).json({
          success: false,
          message: "yearFrom cannot be greater than yearTo",
        });
      }
    }

    // Rating filter
    const parsedMinRating = safeFloat(minRating);
    const parsedMaxRating = safeFloat(maxRating);
    if (parsedMinRating !== null || parsedMaxRating !== null) {
      filter.totalRating = {};
      if (parsedMinRating !== null) {
        if (parsedMinRating < 0 || parsedMinRating > 10) {
          return res.status(400).json({
            success: false,
            message: "minRating must be between 0 and 10",
          });
        }
        filter.totalRating[Op.gte] = parsedMinRating;
      }
      if (parsedMaxRating !== null) {
        if (parsedMaxRating < 0 || parsedMaxRating > 10) {
          return res.status(400).json({
            success: false,
            message: "maxRating must be between 0 and 10",
          });
        }
        filter.totalRating[Op.lte] = parsedMaxRating;
      }
      if (
        parsedMinRating !== null &&
        parsedMaxRating !== null &&
        parsedMinRating > parsedMaxRating
      ) {
        return res.status(400).json({
          success: false,
          message: "minRating cannot be greater than maxRating",
        });
      }
    }

    const { rows: movies, count } = await Movie.findAndCountAll({
      where: filter,
      include: [{ model: Review, as: "reviews", attributes: ["id", "rating"] }],
      order: [["year", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: movies,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("getFilteredMovies error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while filtering movies",
    });
  }
};


// ===============================
// GET MOVIE BY ID (with reviews + user)
// ===============================
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const movieId = safeInt(id);

    if (!movieId || movieId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const fetchMovie = await Movie.findByPk(movieId, { include: movieIncludes });

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
    console.error("getMovieById error:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching movie",
    });
  }
};

module.exports = {
  getAllMovies,
  getFilteredMovies,
  getMovieById,
};
