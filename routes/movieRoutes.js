const { getAllMovies, getFilteredMovies, getMovieById, importPopularMovies, deleteAllMovies } = require('../controller/movieController');
const { validateIdParam } = require('../helpers/routeValidators');
const authGuard = require('../helpers/authguard');
const isAdmin = require('../helpers/isAdmin');
const router = require('express').Router();

// Backward-compatible routes
router.get('/getmovies',getAllMovies);
router.get('/filtermovies',getFilteredMovies);
router.get('/getMovieById/:id',validateIdParam('id'),getMovieById);
router.get('/import', authGuard, isAdmin, importPopularMovies);
router.delete('/delete-all', authGuard, isAdmin, deleteAllMovies);

// REST-style aliases
router.get('/', getAllMovies);
router.get('/filter', getFilteredMovies);
router.get('/:id', validateIdParam('id'), getMovieById);

module.exports = router;
