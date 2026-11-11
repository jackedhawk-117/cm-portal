/**
 * Central runtime configuration.
 * Loads `.env` from the repository root (preferred) and, if present,
 * `server/.env` without overwriting already-set variables.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const env = process.env;
const isTest = env.NODE_ENV === 'test';
const isProduction = env.NODE_ENV === 'production';

const config = {
  env: env.NODE_ENV || 'development',
  isProduction,
  isTest,
  port: toInt(env.PORT, 4000),
  databaseUrl: isTest
    ? env.DATABASE_URL_TEST || env.DATABASE_URL || 'postgresql://app:app@127.0.0.1:5432/cm_portal_test'
    : env.DATABASE_URL || 'postgresql://app:app@127.0.0.1:5432/cm_portal',
  jwt: {
    secret: env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
    expiresIn: env.JWT_EXPIRES_IN || '7d',
    cookieName: 'cmk_token',
  },
  clientOrigins: (env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploads: {
    maxBytes: 5 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY || '',
    model: env.GEMINI_MODEL || 'gemini-2.5-flash',
    timeoutMs: toInt(env.GEMINI_TIMEOUT_MS, 20000),
    // The public free-tier endpoint; the key is sent as a query parameter
    // but never leaves the server (the browser only talks to our API).
    baseUrl: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
  },
  // SLA (in days) used for the "overdue" computation. Configurable constant.
  slaDays: {
    High: toInt(env.SLA_HIGH_DAYS, 3),
    Medium: toInt(env.SLA_MEDIUM_DAYS, 7),
    Low: toInt(env.SLA_LOW_DAYS, 15),
  },
  demoPassword: env.DEMO_PASSWORD || 'Demo@12345',
  seed: {
    grievanceCount: toInt(env.SEED_GRIEVANCE_COUNT, 40),
  },
};

if (isProduction && config.jwt.secret === 'dev-only-secret-do-not-use-in-production') {
  // Fail fast rather than run production with a known secret.
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
