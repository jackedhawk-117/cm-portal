const { ZodError } = require('zod');
const { unprocessable } = require('../utils/AppError');

/** Format a ZodError as a list of `{ path, message }` details. */
function zodDetails(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validate request data with a Zod schema.
 * @param {object} schema - { body?, query?, params? } of Zod schemas
 */
function validate(schema) {
  return (req, _res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.validatedQuery = schema.query.parse(req.query);
      if (schema.params) req.params = schema.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(unprocessable('Request validation failed', zodDetails(err)));
      }
      next(err);
    }
  };
}

module.exports = { validate, zodDetails };
