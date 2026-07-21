import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { encryptConnectorConfig } from '../security/connectorCrypto';
import { verifySourceConnection } from '../services/sourceSync';

const router = Router();
router.use(authMiddleware);
const kinds = new Set(['CRM', 'EMAIL', 'CALENDAR', 'ENRICHMENT', 'CONSENT', 'SUPPRESSION']);
const directions = new Set(['PULL', 'PUSH', 'BIDIRECTIONAL']);

router.get('/', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const connections = await prisma.sourceConnection.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, include: { syncRuns: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  res.json(connections.map(({ configEncrypted: _secret, ...connection }) => ({ ...connection, configured: true })));
});

router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, kind, direction, config } = req.body;
    if (typeof name !== 'string' || !name.trim() || !kinds.has(kind) || !directions.has(direction)) return res.status(422).json({ error: 'valid name, kind, and direction are required' });
    const prisma: PrismaClient = req.app.get('prisma');
    const connection = await prisma.sourceConnection.create({ data: { userId: req.userId!, name: name.trim(), kind, direction, configEncrypted: encryptConnectorConfig(config), status: 'INACTIVE' } });
    const { configEncrypted: _secret, ...safe } = connection;
    res.status(201).json({ ...safe, configured: true });
  } catch (error: any) {
    res.status(422).json({ error: error.message || 'source connection could not be created' });
  }
});

router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const existing = await prisma.sourceConnection.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: 'Source connection not found' });
  const data: any = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim();
  if (req.body.direction && directions.has(req.body.direction)) data.direction = req.body.direction;
  if (req.body.config) data.configEncrypted = encryptConnectorConfig(req.body.config);
  if (req.body.status && ['ACTIVE', 'INACTIVE'].includes(req.body.status)) data.status = req.body.status;
  const updated = await prisma.sourceConnection.update({ where: { id: existing.id }, data });
  const { configEncrypted: _secret, ...safe } = updated;
  res.json({ ...safe, configured: true });
});

router.post('/:id/verify', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const connection = await prisma.sourceConnection.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!connection) return res.status(404).json({ error: 'Source connection not found' });
    res.json(await verifySourceConnection(connection.configEncrypted));
  } catch (error: any) {
    res.status(502).json({ error: error.message || 'Connection verification failed' });
  }
});

router.post('/:id/sync-runs', async (req: AuthRequest, res: Response) => {
  const idempotencyKey = String(req.header('Idempotency-Key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 200) return res.status(422).json({ error: 'Idempotency-Key header is required' });
  const prisma: PrismaClient = req.app.get('prisma');
  const connection = await prisma.sourceConnection.findFirst({ where: { id: req.params.id, userId: req.userId, status: 'ACTIVE' } });
  if (!connection) return res.status(404).json({ error: 'Active source connection not found' });
  const run = await prisma.marketingSyncRun.upsert({
    where: { userId_idempotencyKey: { userId: req.userId!, idempotencyKey } }, update: {},
    create: { userId: req.userId!, connectionId: connection.id, direction: connection.direction, idempotencyKey, cursorBefore: connection.cursor },
  });
  res.status(run.status === 'QUEUED' ? 202 : 200).json(run);
});

router.get('/:id/sync-runs', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const connection = await prisma.sourceConnection.findFirst({ where: { id: req.params.id, userId: req.userId }, select: { id: true } });
  if (!connection) return res.status(404).json({ error: 'Source connection not found' });
  res.json(await prisma.marketingSyncRun.findMany({ where: { connectionId: connection.id }, orderBy: { createdAt: 'desc' }, take: 100 }));
});

router.post('/sync-runs/:runId/cancel', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const run = await prisma.marketingSyncRun.findFirst({ where: { id: req.params.runId, userId: req.userId } });
  if (!run) return res.status(404).json({ error: 'Sync run not found' });
  if (!['QUEUED', 'RETRY_WAIT'].includes(run.status)) return res.status(409).json({ error: 'Only pending sync runs can be cancelled' });
  res.json(await prisma.marketingSyncRun.update({ where: { id: run.id }, data: { status: 'CANCELLED', completedAt: new Date() } }));
});

export default router;

