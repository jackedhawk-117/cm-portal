/**
 * Non-destructive seed guard used by the production start command.
 *
 * Render redeploys restart the process. Running the full seed every time would
 * truncate real (or at least newly created) data, so we only seed when the
 * database has no grievances yet. The deterministic demo seed remains available
 * explicitly via `npm run db:seed`.
 */
const { pool } = require('./pool');
const { seed } = require('./seed');

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT count(*)::int AS c FROM grievances');
  if (rows[0].c > 0) {
    // eslint-disable-next-line no-console
    console.log(`[seed] ${rows[0].c} grievances present – skipping demo seed`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[seed] empty database – loading fictional demo data');
  await seed();
}

if (require.main === module) {
  seedIfEmpty()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seed] guard failed:', err.message);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seedIfEmpty };
