const { registerUser, login } = require('../controller/authController');

const express = require('express').Router();

express.post('/register',registerUser);
express.post('/login',login);

module.exports = express;