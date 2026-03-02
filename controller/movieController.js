const Movie = require("../models/MovieModel");
const Review = require("../models/ReviewModel");
const User = require("../models/UserModel");
const { Op } = require("sequelize");
const { sequelize } = require("../database/db");

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

// ===============================
// IMPORT POPULAR MOVIES FROM TMDB
// ===============================
const importPopularMovies = async (req, res) => {
  const tmdbApiKey = process.env.TMDB_API_KEY;

  if (!tmdbApiKey) {
    return res.status(500).json({
      success: false,
      message: "TMDB_API_KEY is not configured",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${encodeURIComponent(
        tmdbApiKey
      )}`
    );

    if (!tmdbResponse.ok) {
      throw new Error(`TMDB request failed with status ${tmdbResponse.status}`);
    }

    const payload = await tmdbResponse.json();
    const movies = payload?.results;

    if (!Array.isArray(movies) || movies.length === 0) {
      throw new Error("No movies received from TMDB");
    }

    const formattedMovies = movies.map((movie) => ({
      title: movie.title || "Untitled",
      year: movie.release_date
        ? Number.parseInt(String(movie.release_date).slice(0, 4), 10)
        : null,
      rating: Number(movie.vote_average) || null,
      totalRating: Number(movie.vote_average) || null,
      votes:
        movie.vote_count !== undefined && movie.vote_count !== null
          ? String(movie.vote_count)
          : null,
      ageRating: "UA",
      duration: null,
      genres: Array.isArray(movie.genre_ids) ? movie.genre_ids.join(", ") : null,
      director: null,
      writers: null,
      revenue: null,
      releaseDate: movie.release_date || null,
      languages: movie.original_language || null,
      synopsis: movie.overview || null,
      imageUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null,
    }));

    await Movie.destroy({
      where: {},
      truncate: true,
      restartIdentity: true,
      cascade: true,
      transaction,
    });

    await Movie.bulkCreate(formattedMovies, { transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Popular movies imported successfully",
      count: formattedMovies.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("importPopularMovies error:", error);

    return res.status(500).json({
      success: false,
      message: "Import failed. Existing data preserved.",
    });
  }
};

module.exports = {
  getAllMovies,
  getFilteredMovies,
  getMovieById,
  importPopularMovies,
};
