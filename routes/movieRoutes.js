const { getAllMovies, getFilteredMovies, getMovieById } = require('../controller/movieController');
const { validateIdParam } = require('../helpers/routeValidators');
const router = require('express').Router();

// Backward-compatible routes
router.get('/getmovies',getAllMovies);
router.get('/filtermovies',getFilteredMovies);
router.get('/getMovieById/:id',validateIdParam('id'),getMovieById);

// REST-style aliases
router.get('/', getAllMovies);
router.get('/filter', getFilteredMovies);
router.get('/:id', validateIdParam('id'), getMovieById);

module.exports = router;
