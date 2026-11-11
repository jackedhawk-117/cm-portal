const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { getPublicStats, getCmoStats } = require('../services/stats.service');

const router = express.Router();

router.get('/public', asyncHandler(async (_req, res) => {
  res.json({ data: await getPublicStats() });
}));

router.get(
  '/cmo',
  authenticate,
  authorize('CMO_ADMIN'),
  asyncHandler(async (_req, res) => {
    res.json({ data: await getCmoStats() });
  }),
);

module.exports = router;
