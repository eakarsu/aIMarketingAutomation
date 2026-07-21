import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { processDeliveryJobs } from './services/sendExecutor';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function tick() {
  const result = await processDeliveryJobs(prisma);
  if (result.processed) console.log('[delivery-worker]', result);
}

const timer = setInterval(() => void tick().catch((error) => console.error('[delivery-worker]', error)), 5_000);
void tick().catch((error) => console.error('[delivery-worker]', error));

async function shutdown() {
  clearInterval(timer);
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

