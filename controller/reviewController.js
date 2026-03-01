const Review = require("../models/ReviewModel");
const Movie = require("../models/MovieModel");
const User = require("../models/UserModel");

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_REVIEW_LENGTH = 2000;

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseRating = (value) => {
  const rating = Number(value);
  return Number.isInteger(rating) ? rating : null;
};

const parsePagination = (query) => {
  const pageNum = Number(query.page);
  const limitNum = Number(query.limit);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const rawLimit = Number.isInteger(limitNum) && limitNum > 0 ? limitNum : DEFAULT_PAGE_SIZE;
  const limit = Math.min(rawLimit, MAX_PAGE_SIZE);
  return { page, limit, offset: (page - 1) * limit };
};

// ========================================
// CREATE REVIEW
// ========================================
const createReview = async (req, res) => {
  const { movie_id, rating, review_text, is_spoiler } = req.body;
  const user_id = req.user?.userId;
  const movieId = parseId(movie_id);
  const parsedRating = parseRating(rating);
  const normalizedReviewText = typeof review_text === "string" ? review_text.trim() : "";
  const normalizedSpoiler = typeof is_spoiler === "boolean" ? is_spoiler : false;

  try {
    if (!user_id || !movieId || !parsedRating) {
      return res.status(400).json({
        success: false,
        message: "User, Movie and Rating are required",
      });
    }

    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (normalizedReviewText.length > MAX_REVIEW_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Review text cannot exceed ${MAX_REVIEW_LENGTH} characters`,
      });
    }

    // Check if movie exists
    const movie = await Movie.findByPk(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    // Prevent duplicate review
    const existingReview = await Review.findOne({
      where: { user_id, movie_id: movieId },
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this movie",
      });
    }

    const review = await Review.create({
      user_id,
      movie_id: movieId,
      rating: parsedRating,
      review_text: normalizedReviewText || null,
      is_spoiler: normalizedSpoiler,
    });

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    console.error("createReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create review",
    });
  }
};


// ========================================
// UPDATE REVIEW
// ========================================
const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, review_text, is_spoiler } = req.body;
  const reviewId = parseId(id);

  try {
    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id",
      });
    }

    const review = await Review.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = Number(review.user_id) === Number(req.user?.userId);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own review",
      });
    }

    if (rating !== undefined) {
      const parsedRating = parseRating(rating);
      if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be an integer between 1 and 5",
        });
      }
    }

    if (review_text !== undefined) {
      if (typeof review_text !== "string") {
        return res.status(400).json({
          success: false,
          message: "review_text must be a string",
        });
      }
      if (review_text.trim().length > MAX_REVIEW_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Review text cannot exceed ${MAX_REVIEW_LENGTH} characters`,
        });
      }
    }

    if (is_spoiler !== undefined && typeof is_spoiler !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_spoiler must be boolean",
      });
    }

    await review.update({
      rating: rating !== undefined ? Number(rating) : review.rating,
      review_text: review_text !== undefined ? review_text.trim() : review.review_text,
      is_spoiler: is_spoiler ?? review.is_spoiler,
    });

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("updateReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
    });
  }
};


// ========================================
// DELETE REVIEW
// ========================================
const deleteReview = async (req, res) => {
  const { id } = req.params;
  const reviewId = parseId(id);

  try {
    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Invalid review id",
      });
    }

    const review = await Review.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = Number(review.user_id) === Number(req.user?.userId);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own review",
      });
    }

    await review.destroy();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("deleteReview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};


// ========================================
// GET REVIEWS BY MOVIE
// ========================================
const getReviewsByMovie = async (req, res) => {
  const { movieId } = req.params;
  const parsedMovieId = parseId(movieId);

  try {
    if (!parsedMovieId) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { rows: reviews, count } = await Review.findAndCountAll({
      where: { movie_id: parsedMovieId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: reviews,
    });
  } catch (error) {
    console.error("getReviewsByMovie error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};


// ========================================
// GET REVIEWS BY USER
// ========================================
const getReviewsByUser = async (req, res) => {
  const { userId } = req.params;
  const parsedUserId = parseId(userId);

  try {
    if (!parsedUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const isOwner = Number(req.user?.userId) === parsedUserId;
    const isAdmin = req.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { rows: reviews, count } = await Review.findAndCountAll({
      where: { user_id: parsedUserId },
      include: [
        {
          model: Movie,
          as: "movie",
          attributes: ["id", "title", "imageUrl"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: reviews,
    });
  } catch (error) {
    console.error("getReviewsByUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user reviews",
    });
  }
};

// ========================================
// GET ALL REVIEWS (ADMIN)
// ========================================
const getAllReviewsAdmin = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows: reviews, count } = await Review.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const userIds = [...new Set(reviews.map((review) => review.user_id))];
    const movieIds = [...new Set(reviews.map((review) => review.movie_id))];

    const [users, movies] = await Promise.all(
      [
        userIds.length
          ? User.findAll({
              where: { id: userIds },
              attributes: ["id", "name", "email"],
            })
          : Promise.resolve([]),
        movieIds.length
          ? Movie.findAll({
              where: { id: movieIds },
              attributes: ["id", "title", "imageUrl"],
            })
          : Promise.resolve([]),
      ]
    );

    const userMap = new Map(users.map((user) => [Number(user.id), user]));
    const movieMap = new Map(movies.map((movie) => [Number(movie.id), movie]));

    const formattedReviews = reviews.map((review) => {
      const reviewJson = review.toJSON();

      return {
        ...reviewJson,
        user: userMap.get(Number(review.user_id)) || null,
        movie: movieMap.get(Number(review.movie_id)) || null,
      };
    });

    return res.status(200).json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: formattedReviews,
    });
  } catch (error) {
    console.error("getAllReviewsAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};


module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getReviewsByMovie,
  getReviewsByUser,
  getAllReviewsAdmin,
};
