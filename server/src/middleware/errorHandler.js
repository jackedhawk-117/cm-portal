const multer = require('multer');
const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');
const { zodDetails } = require('./validate');
const config = require('../config');

/** 404 for unknown API routes. */
function apiNotFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No API route for ${req.method} ${req.originalUrl}`,
    },
  });
}

/** 404 for unknown non-API routes when no SPA build is present. */
function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

/**
 * Central error handler.
 * Every error leaves the API in the same shape:
 *   { "error": { "code": "...", "message": "...", "details": [...]? } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: zodDetails(err) },
    });
  }

  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is larger than ${config.uploads.maxBytes / (1024 * 1024)} MB`
        : `Upload failed: ${err.message}`;
    return res.status(status).json({ error: { code: 'UPLOAD_ERROR', message } });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }

  // Unique violation mapped to a friendly conflict.
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists' } });
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err.stack || err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'An internal server error occurred' : err.message || 'Internal error',
    },
  });
}

module.exports = { errorHandler, apiNotFound, notFound, AppError };
