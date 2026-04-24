const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error(err);

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return ApiResponse.badRequest(res, 'Validation error', errors);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return ApiResponse.conflict(res, 'Duplicate entry', errors);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  return ApiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
