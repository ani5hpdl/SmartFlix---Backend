const { getAllMovies, getFilteredMovies } = require('../controller/movieController');

const express = require('express').Router();

express.get('/getmovies',getAllMovies);
express.get('/filtermovies',getFilteredMovies);

module.exports = express;