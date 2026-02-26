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

const express = require("express").Router();

express.post("/addReview",authGuard,createReview);
express.post("/updateReview/:id",authGuard,updateReview);
express.delete("/deleteReview/:id",authGuard,deleteReview);
express.get("/getReviewsByMovie/:movieId",getReviewsByMovie);
express.get("/getReviewsByUser/:userId",getReviewsByUser);
express.get("/getAllReviews",authGuard,isAdmin,getAllReviewsAdmin);
    
module.exports = express; 
