const { getAllMovies, getFilteredMovies, getMovieById } = require('../controller/movieController');

const express = require('express').Router();

express.get('/getmovies',getAllMovies);
express.get('/filtermovies',getFilteredMovies);
express.get('/getMovieById/:id',getMovieById);

module.exports = express;