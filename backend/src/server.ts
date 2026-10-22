import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`Makeup Booking API ready at http://localhost:${env.port}${env.apiPrefix}`);
    logger.info(`Environment: ${env.nodeEnv} | Razorpay: ${env.razorpay.enabled ? 'live keys' : 'MOCK mode'}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
