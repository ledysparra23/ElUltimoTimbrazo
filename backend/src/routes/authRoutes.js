const express = require('express');
const router = express.Router();
const { register, loginStep1, loginStep2, loginDirect, resendOtp, me } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', loginStep1);              // Step 1: valida credenciales, envía OTP
router.post('/login/verify-otp', loginStep2);   // Step 2: verifica OTP, devuelve JWT
router.post('/login/direct', loginDirect);      // Sin OTP: login directo (usuario lo desactivó)
router.post('/login/resend-otp', resendOtp);
router.get('/me', auth(), me);

module.exports = router;
