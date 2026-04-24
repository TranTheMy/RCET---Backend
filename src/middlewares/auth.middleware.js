const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const ApiResponse = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.accessSecret);

    const user = await User.findByPk(decoded.user_id, {
      attributes: ['id', 'full_name', 'email', 'system_role', 'status', 'email_verified'],
    });

    if (!user) {
      return ApiResponse.unauthorized(res, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Access token expired');
    }
    return ApiResponse.unauthorized(res, 'Invalid access token');
  }
};

module.exports = authMiddleware;
