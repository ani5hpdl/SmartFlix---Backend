const {
  createReview,
  updateReview,
  deleteReview,
  getReviewsByMovie,
  getReviewsByUser,
  getAllReviewsAdmin,
} = require("../controller/reviewController");
const authGuard = require("../helpers/authguard");
const isAdmin = require("../helpers/isAdmin");
const { validateIdParam } = require("../helpers/routeValidators");
const router = require("express").Router();

// Backward-compatible routes
router.post("/addReview",authGuard,createReview);
router.post("/updateReview/:id",authGuard,validateIdParam("id"),updateReview);
router.delete("/deleteReview/:id",authGuard,validateIdParam("id"),deleteReview);
router.get("/getReviewsByMovie/:movieId",validateIdParam("movieId"),getReviewsByMovie);
router.get("/getReviewsByUser/:userId",authGuard,validateIdParam("userId"),getReviewsByUser);
router.get("/getAllReviews",authGuard,isAdmin,getAllReviewsAdmin);

// REST-style aliases
router.post("/", authGuard, createReview);
router.put("/:id", authGuard, validateIdParam("id"), updateReview);
router.delete("/:id", authGuard, validateIdParam("id"), deleteReview);
router.get("/movie/:movieId", validateIdParam("movieId"), getReviewsByMovie);
router.get("/user/:userId", authGuard, validateIdParam("userId"), getReviewsByUser);
router.get("/", authGuard, isAdmin, getAllReviewsAdmin);
    
module.exports = router; 
