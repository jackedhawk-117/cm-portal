const { createApp } = require('./app');
const config = require('./config');
const { pool } = require('./db/pool');

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${config.port} (env=${config.env})`);
  if (!config.gemini.apiKey) {
    // eslint-disable-next-line no-console
    console.log('[ai] GEMINI_API_KEY not set – AI analysis will use the labelled fallback classifier');
  }
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[api] ${signal} received, shutting down`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  // Force-exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
