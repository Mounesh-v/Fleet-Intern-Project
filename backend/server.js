import app from './app.js';
import env from './utility/env.js';
import database from './utility/db.js';

/**
 * Server — process entry point: load env, connect DB, listen.
 *
 * OOP notes:
 * - Uses singleton Env + Database utilities; graceful shutdown on signals.
 */
async function start() {
  env.assertEnv();

  if (!env.adminPassword) {
    console.warn(
      'WARNING: ADMIN_PASSWORD is not set. Run "npm run create-admin" after configuring .env.',
    );
  }

  await database.connect();
  console.log('MongoDB connected');

  const server = app.listen(env.port, () => {
    console.log(`Fleet API listening on port ${env.port}`);
  });

  const shutdown = async signal => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await database.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
