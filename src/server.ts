import { app } from './app';
import { env } from './config/env';
import { sequelize } from './models';

async function main() {
  await sequelize.authenticate();
  const server = app.listen(env.PORT, () => {
    console.log(`SweetList API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
