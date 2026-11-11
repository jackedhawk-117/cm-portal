const rateLimit = require('express-rate-limit');
const config = require('../config');

const handler = (_req, res) =>
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a little and try again.',
    },
  });

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  // Rate limiting is disabled under Jest so tests are deterministic.
  skip: () => config.isTest,
};

// Broad guard for the whole API.
const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

// Stricter limit for credential endpoints (brute-force protection).
const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 25,
});

// AI calls are expensive; keep the free-tier quota safe.
const aiLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  limit: 15,
});

const contactLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

module.exports = { apiLimiter, authLimiter, aiLimiter, contactLimiter };
