const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, sendOtpSchema, verifyOtpSchema, completeRegistrationSchema } = require('../validators/auth.schema');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/otp/send', authLimiter, validate({ body: sendOtpSchema }), ctrl.sendOtp);
router.post('/otp/verify', authLimiter, validate({ body: verifyOtpSchema }), ctrl.verifyOtp);
router.post('/otp/complete-registration', authLimiter, validate({ body: completeRegistrationSchema }), ctrl.completeRegistration);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
