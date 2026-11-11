const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

/**
 * Single shared connection pool.
 * Neon requires SSL; local Postgres usually does not. We enable SSL only when
 * the connection string asks for it (or when explicitly running on Neon).
 */
const useSsl =
  /sslmode=require/i.test(config.databaseUrl) || /neon\.tech/i.test(config.databaseUrl);

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.isTest ? 5 : 10,
  idleTimeoutMillis: 30_000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  // A pool-level error should be loud but must not crash the process.
  // eslint-disable-next-line no-console
  console.error('[db] idle client error', err.message);
});

const query = (text, params) => pool.query(text, params);

/**
 * Run a callback inside a transaction with a dedicated client.
 * Rolls back on any thrown error and always releases the client.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
