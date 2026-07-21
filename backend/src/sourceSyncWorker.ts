import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { processSourceSyncs } from './services/sourceSync';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();
async function tick() { const result = await processSourceSyncs(prisma); if (result.completed || result.failed || result.retried) console.log('[source-sync-worker]', result); }
const timer = setInterval(() => void tick().catch((error) => console.error('[source-sync-worker]', error)), 10_000);
void tick().catch((error) => console.error('[source-sync-worker]', error));
async function shutdown() { clearInterval(timer); await prisma.$disconnect(); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

