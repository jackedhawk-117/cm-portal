const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const { analyzeSchema } = require('../validators/ai.schema');
const { analyze } = require('../services/ai.service');
const { AppError } = require('../utils/AppError');

const router = express.Router();

/**
 * POST /api/ai/analyze
 * Authenticated citizens only. The API key never leaves the server.
 * Always returns an advisory suggestion – on any AI failure it degrades to the
 * clearly-labelled rule-based fallback instead of failing the request.
 */
router.post(
  '/analyze',
  aiLimiter,
  authenticate,
  authorize('CITIZEN'),
  validate({ body: analyzeSchema }),
  asyncHandler(async (req, res) => {
    try {
      const data = await analyze({
        description: req.body.description,
        district: req.body.district,
        user: req.user,
      });
      res.json({ data });
    } catch (err) {
      if (err.statusCode === 503) {
        throw new AppError(503, 'AI_UNAVAILABLE', 'The grievance assistant is temporarily unavailable');
      }
      throw err;
    }
  }),
);

module.exports = router;
