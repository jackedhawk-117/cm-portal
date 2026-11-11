/**
 * Jest setupFiles entry – runs before each test file's modules are loaded.
 * Forces the test environment and the dedicated test database.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgresql://app:app@127.0.0.1:5432/cm_portal_test';
// Tests must be deterministic and must never call a paid/external AI service.
delete process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';
process.env.LOG_LEVEL = 'silent';
