/**
 * Jest globalSetup – recreates the test database schema from the migrations
 * and loads the fictional seed data once per test run.
 *
 * Requires a reachable PostgreSQL database from DATABASE_URL_TEST
 * (default: postgresql://app:app@127.0.0.1:5432/cm_portal_test).
 */
const path = require('path');
const dotenv = require('dotenv');

module.exports = async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST || 'postgresql://app:app@127.0.0.1:5432/cm_portal_test';
  process.env.GEMINI_API_KEY = '';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';

  const { pool } = require('../src/db/pool');
  const { migrate } = require('../src/db/migrate');
  const { seed } = require('../src/db/seed');

  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
  } catch (err) {
    throw new Error(
      `Could not reset the test database. Is PostgreSQL running and DATABASE_URL_TEST correct? ${err.message}`,
    );
  }

  await migrate();
  await seed();
  await pool.end();
};
