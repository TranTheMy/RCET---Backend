const authService = require('../services/auth.service');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result, 'Registration successful. Please check your email to verify your account.');
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return ApiResponse.badRequest(res, 'Verification token is required');
    const result = await authService.verifyEmail(token);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return ApiResponse.badRequest(res, 'Refresh token is required');
    const result = await authService.refreshAccessToken(refresh_token);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.status) return ApiResponse.error(res, error.message, error.status);
    next(error);
  }
};

const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const result = await authService.googleLogin(user);
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?access_token=${result.access_token}&refresh_token=${result.refresh_token}&status=${user.status}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error?message=${error.message}`);
  }
};

const googleError = (req, res) => {
  ApiResponse.unauthorized(res, 'Google authentication failed or was cancelled');
};

module.exports = {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  googleCallback,
  googleError,
};

