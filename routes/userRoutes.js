const { createUser, getAllUser, getUserById, updateUser } = require('../controller/userController');
const authGuard = require('../helpers/authguard');
const isAdmin = require('../helpers/isAdmin');

const express = require('express').Router();

express.post('/createUser',authGuard,isAdmin,createUser);
express.post('/updateUser/:id',authGuard,isAdmin,updateUser);
express.get('/getUsers',authGuard,isAdmin,getAllUser);
express.get('/getUserById/:id',authGuard,isAdmin,getUserById);

module.exports = express;