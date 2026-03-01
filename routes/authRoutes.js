const { registerUser, login, logOut, verify, getMe } = require('../controller/authController');
const authGuard = require('../helpers/authguard');
const router = require('express').Router();

router.post('/register',registerUser);
router.post('/login',login);
router.post('/logout',authGuard,logOut);
router.get('/verify',verify);
router.get('/getMe',authGuard,getMe);

module.exports = router;
