const { registerUser, login, verify } = require('../controller/authController');

const express = require('express').Router();

express.post('/register',registerUser);
express.post('/login',login);
express.get('/verify',verify);

module.exports = express;