/**
 * Wraps async route handlers so rejected promises reach the central error
 * handler (Express 4 does not do this automatically).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
