const ApiResponse = require('../utils/response');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return ApiResponse.badRequest(res, 'Validation failed', errors);
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
