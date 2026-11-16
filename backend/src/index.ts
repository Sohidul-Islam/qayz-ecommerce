import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabaseIfEmpty } from './db/seed.js';

async function bootstrap() {
  await runMigrations();
  await seedDatabaseIfEmpty();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`QAYZ Backend API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start QAYZ backend server:', err);
  process.exit(1);
});
