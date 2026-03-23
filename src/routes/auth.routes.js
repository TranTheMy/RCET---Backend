const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const env = require('../config/env');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/api/auth/google/error' }),
  authController.googleCallback,
);
router.get('/google/error', authController.googleError);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

module.exports = router;

