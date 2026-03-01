const { registerUser, login, logOut, verify, getMe } = require('../controller/authController');
const authGuard = require('../helpers/authguard');

const express = require('express').Router();

express.post('/register',registerUser);
express.post('/login',login);
express.post('/logout',logOut);
express.get('/verify',verify);
express.get('/getMe',authGuard,getMe);

module.exports = express;
