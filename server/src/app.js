const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { query } = require('./db/pool');
const { apiLimiter } = require('./middleware/rateLimit');
const { apiNotFound, notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const statsRoutes = require('./routes/stats.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Render terminates TLS at its proxy; trust the first hop so secure cookies
  // and rate-limit IPs behave correctly.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  const allowlist = new Set(config.clientOrigins);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true); // same-origin / curl / tests
        if (allowlist.has(origin)) return callback(null, true);
        if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  if (!config.isTest) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        // eslint-disable-next-line no-console
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
      });
      next();
    });
  }

  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', db: 'up', uptime: Math.round(process.uptime()), env: config.env });
    } catch (err) {
      res.status(503).json({ status: 'degraded', db: 'down', error: config.isProduction ? 'db_unavailable' : err.message });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api', publicRoutes);

  // Unknown API route → JSON 404 (registered before the SPA fallback).
  app.use('/api', apiNotFound);

  // In production Express serves the built React app from client/dist.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET') return next();
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
