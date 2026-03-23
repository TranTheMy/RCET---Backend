const Joi = require('joi');

const registerSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(255).required()
    .messages({ 'string.min': 'Full name must be at least 2 characters' }),
  email: Joi.string().email().required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
      'string.min': 'Password must be at least 8 characters',
    }),
  student_code: Joi.string().trim().max(50).allow('', null).optional(),
  department: Joi.string().trim().max(255).allow('', null).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
      'string.min': 'Password must be at least 8 characters',
    }),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
      'string.min': 'Password must be at least 8 characters',
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
