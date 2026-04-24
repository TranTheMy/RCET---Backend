const Joi = require('joi');
const { SYSTEM_ROLE_VALUES } = require('../config/constants');

const approveSchema = Joi.object({
  system_role: Joi.string().valid(...SYSTEM_ROLE_VALUES).required()
    .messages({ 'any.only': `Role must be one of: ${SYSTEM_ROLE_VALUES.join(', ')}` }),
  review_note: Joi.string().max(1000).allow('', null).optional(),
});

const rejectSchema = Joi.object({
  review_note: Joi.string().max(1000).allow('', null).optional(),
});

module.exports = {
  approveSchema,
  rejectSchema,
};
