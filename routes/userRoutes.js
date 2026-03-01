const { createUser, getAllUser, getUserById, updateUser } = require('../controller/userController');
const authGuard = require('../helpers/authguard');
const isAdmin = require('../helpers/isAdmin');
const { validateIdParam } = require('../helpers/routeValidators');
const router = require('express').Router();

// Backward-compatible routes
router.post('/createUser',authGuard,isAdmin,createUser);
router.post('/updateUser/:id',authGuard,isAdmin,validateIdParam('id'),updateUser);
router.get('/getUsers',authGuard,isAdmin,getAllUser);
router.get('/getUserById/:id',authGuard,isAdmin,validateIdParam('id'),getUserById);

// REST-style aliases
router.post('/', authGuard, isAdmin, createUser);
router.get('/', authGuard, isAdmin, getAllUser);
router.get('/:id', authGuard, isAdmin, validateIdParam('id'), getUserById);
router.put('/:id', authGuard, isAdmin, validateIdParam('id'), updateUser);

module.exports = router;
