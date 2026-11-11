/**
 * Minimal SQL migration runner.
 * - Creates `schema_migrations` if missing.
 * - Applies every .sql file in ./migrations in filename order, once.
 * - Each migration runs inside a transaction.
 *
 * Usage: node src/db/migrate.js  (also executed automatically on production start)
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const config = require('../config');

async function migrate() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      // eslint-disable-next-line no-console
      console.log(`[migrate] applying ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[migrate] up to date (${files.length} migration file(s), db=${config.env})`);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[migrate] failed:', err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { migrate };
