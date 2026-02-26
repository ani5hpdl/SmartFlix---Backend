const Review = require("../models/ReviewModel");
const Movie = require("../models/MovieModel");
const User = require("../models/UserModel");
const { Op } = require("sequelize");

// ========================================
// CREATE REVIEW
// ========================================
const createReview = async (req, res) => {
  const { user_id, movie_id, rating, review_text, is_spoiler } = req.body;

  try {
    if (!user_id || !movie_id || !rating) {
      return res.status(400).json({
        success: false,
        message: "User, Movie and Rating are required",
      });
    }

    // Check if movie exists
    const movie = await Movie.findByPk(movie_id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    // Prevent duplicate review
    const existingReview = await Review.findOne({
      where: { user_id, movie_id },
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this movie",
      });
    }

    const review = await Review.create({
      user_id,
      movie_id,
      rating,
      review_text,
      is_spoiler,
    });

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create review",
      error: error.message,
    });
  }
};


// ========================================
// UPDATE REVIEW
// ========================================
const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, review_text, is_spoiler } = req.body;

  try {
    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = Number(review.user_id) === Number(req.user?.id);
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own review",
      });
    }

    await review.update({
      rating: rating ?? review.rating,
      review_text: review_text ?? review.review_text,
      is_spoiler: is_spoiler ?? review.is_spoiler,
    });

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};


// ========================================
// DELETE REVIEW
// ========================================
const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = Number(review.user_id) === Number(req.user?.id);
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
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};


// ========================================
// GET REVIEWS BY MOVIE
// ========================================
const getReviewsByMovie = async (req, res) => {
  const { movieId } = req.params;

  try {
    const reviews = await Review.findAll({
      where: { movie_id: movieId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};


// ========================================
// GET REVIEWS BY USER
// ========================================
const getReviewsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const reviews = await Review.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Movie,
          as: "movie",
          attributes: ["id", "title", "imageUrl"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user reviews",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL REVIEWS (ADMIN)
// ========================================
const getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      order: [["createdAt", "DESC"]],
    });

    const userIds = [...new Set(reviews.map((review) => review.user_id))];
    const movieIds = [...new Set(reviews.map((review) => review.movie_id))];

    const [users, movies] = await Promise.all([
      User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ["id", "name", "email"],
      }),
      Movie.findAll({
        where: { id: { [Op.in]: movieIds } },
        attributes: ["id", "title", "imageUrl"],
      }),
    ]);

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
      total: formattedReviews.length,
      data: formattedReviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
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
