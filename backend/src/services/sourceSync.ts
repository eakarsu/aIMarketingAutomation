import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { decryptConnectorConfig } from '../security/connectorCrypto';

type ConnectorConfig = { baseUrl: string; token?: string; pullPath?: string; pushPath?: string; healthPath?: string };
type RemoteRecord = Record<string, any> & { externalId: string; email?: string; deleted?: boolean; updatedAt?: string };

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value, Object.keys((value || {}) as object).sort())).digest('hex');
}

function validatedUrl(baseUrl: string, pathName: string): URL {
  const url = new URL(pathName, baseUrl);
  if (url.protocol !== 'https:') throw new Error('connector endpoints must use HTTPS');
  const allowlist = (process.env.CONNECTOR_HOST_ALLOWLIST || '').split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(url.hostname.toLowerCase())) throw new Error('connector host is not allowlisted');
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|::1$)/i.test(url.hostname)) throw new Error('private connector hosts are not allowed');
  return url;
}

async function connectorRequest(config: ConnectorConfig, pathName: string, init: RequestInit = {}): Promise<Response> {
  const url = validatedUrl(config.baseUrl, pathName);
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json', ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw Object.assign(new Error(`connector returned HTTP ${response.status}`), { retryable: response.status === 429 || response.status >= 500 });
  return response;
}

export async function verifySourceConnection(configEncrypted: string): Promise<{ ok: true; status: number }> {
  const config = decryptConnectorConfig<ConnectorConfig>(configEncrypted);
  const response = await connectorRequest(config, config.healthPath || '/health', { method: 'GET' });
  return { ok: true, status: response.status };
}

async function pullPage(config: ConnectorConfig, kind: string, cursor: string | null) {
  const pathName = new URL(config.pullPath || '/contacts', 'https://connector.invalid');
  if (cursor) pathName.searchParams.set('cursor', cursor);
  pathName.searchParams.set('sourceKind', kind);
  const response = await connectorRequest(config, `${pathName.pathname}${pathName.search}`);
  const body = await response.json() as any;
  if (!body || !Array.isArray(body.records)) throw new Error('connector response must contain a records array');
  if (body.records.length > 5_000) throw new Error('connector page exceeds 5000 records');
  return { records: body.records as RemoteRecord[], deletedExternalIds: Array.isArray(body.deletedExternalIds) ? body.deletedExternalIds.map(String) : [], nextCursor: body.nextCursor ? String(body.nextCursor) : null };
}

async function upsertCustomerRecord(prisma: PrismaClient, run: any, connection: any, record: RemoteRecord): Promise<'pulled' | 'deduplicated'> {
  if (!record.externalId || !record.email) throw new Error('customer source records require externalId and email');
  const email = record.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('customer source record has an invalid email');
  const remoteDigest = digest(record);
  const existingMapping = await prisma.contactSourceMapping.findUnique({ where: { connectionId_externalId: { connectionId: connection.id, externalId: String(record.externalId) } } });
  if (existingMapping?.remoteDigest === remoteDigest) return 'deduplicated';
  const contact = await prisma.contact.upsert({
    where: { userId_email: { userId: run.userId, email } },
    create: {
      userId: run.userId, email, phone: record.phone || null, firstName: record.firstName || null, lastName: record.lastName || null,
      company: record.company || null, source: connection.kind.toLowerCase(), sourceUpdatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(), sourceDigest: remoteDigest,
      region: record.region || 'UNKNOWN', timezoneOffsetMinutes: Number(record.timezoneOffsetMinutes || 0),
    },
    update: {
      phone: record.phone || undefined, firstName: record.firstName || undefined, lastName: record.lastName || undefined, company: record.company || undefined,
      source: connection.kind.toLowerCase(), sourceUpdatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(), sourceDigest: remoteDigest,
      region: record.region || undefined, timezoneOffsetMinutes: Number.isInteger(record.timezoneOffsetMinutes) ? record.timezoneOffsetMinutes : undefined,
    },
  });
  await prisma.contactSourceMapping.upsert({
    where: { connectionId_externalId: { connectionId: connection.id, externalId: String(record.externalId) } },
    create: { connectionId: connection.id, contactId: contact.id, externalId: String(record.externalId), remoteDigest, remoteUpdatedAt: record.updatedAt ? new Date(record.updatedAt) : null },
    update: { contactId: contact.id, remoteDigest, remoteUpdatedAt: record.updatedAt ? new Date(record.updatedAt) : null, lastSyncedAt: new Date(), deletedAt: null },
  });
  return existingMapping ? 'pulled' : 'deduplicated';
}

async function applyGovernanceRecord(prisma: PrismaClient, run: any, connection: any, record: RemoteRecord): Promise<void> {
  if (!record.email || !record.externalId) throw new Error(`${connection.kind} records require externalId and email`);
  const contact = await prisma.contact.findUnique({ where: { userId_email: { userId: run.userId, email: record.email.trim().toLowerCase() } } });
  if (!contact) throw new Error(`${connection.kind} record does not match an existing contact`);
  if (connection.kind === 'CONSENT') {
    await prisma.consentEvent.create({ data: {
      userId: run.userId, contactId: contact.id, channel: record.channel || 'EMAIL', status: record.status,
      lawfulBasis: record.lawfulBasis || 'NOT_APPLICABLE', source: `connector:${connection.id}`, evidenceDigest: digest(record),
      privacyNoticeAt: record.privacyNoticeAt ? new Date(record.privacyNoticeAt) : null, expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
      occurredAt: record.occurredAt ? new Date(record.occurredAt) : new Date(),
    } as any });
  } else {
    const identityHash = crypto.createHash('sha256').update(`${record.email.trim().toLowerCase()}:${record.channel || 'ALL'}`).digest('hex');
    await prisma.suppressionEntry.upsert({
      where: { userId_identityHash_channel: { userId: run.userId, identityHash, channel: record.channel || 'ALL' } },
      create: { userId: run.userId, contactId: contact.id, identityHash, channel: record.channel || 'ALL', reason: record.reason || 'MANUAL', region: record.region || contact.region, source: `connector:${connection.id}` },
      update: { contactId: contact.id, active: record.active !== false, reason: record.reason || 'MANUAL', revokedAt: record.active === false ? new Date() : null },
    } as any);
    if (record.active !== false) await prisma.contact.update({ where: { id: contact.id }, data: { optedOutAt: new Date(), status: 'UNSUBSCRIBED' } });
  }
  const remoteDigest = digest(record);
  await prisma.contactSourceMapping.upsert({
    where: { connectionId_externalId: { connectionId: connection.id, externalId: String(record.externalId) } },
    create: { connectionId: connection.id, contactId: contact.id, externalId: String(record.externalId), remoteDigest },
    update: { contactId: contact.id, remoteDigest, lastSyncedAt: new Date(), deletedAt: null },
  });
}

async function pushChanges(prisma: PrismaClient, run: any, connection: any, config: ConnectorConfig): Promise<number> {
  if (!['PUSH', 'BIDIRECTIONAL'].includes(run.direction)) return 0;
  const mappings = await prisma.contactSourceMapping.findMany({ where: { connectionId: connection.id, deletedAt: null }, include: { contact: true }, take: 5_000 });
  let pushed = 0;
  for (const mapping of mappings) {
    if (mapping.contact.updatedAt <= mapping.lastSyncedAt) continue;
    const body = { externalId: mapping.externalId, email: mapping.contact.email, phone: mapping.contact.phone, firstName: mapping.contact.firstName, lastName: mapping.contact.lastName, company: mapping.contact.company, status: mapping.contact.status, updatedAt: mapping.contact.updatedAt };
    await connectorRequest(config, `${config.pushPath || '/contacts'}/${encodeURIComponent(mapping.externalId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await prisma.contactSourceMapping.update({ where: { id: mapping.id }, data: { remoteDigest: digest(body), lastSyncedAt: new Date() } });
    pushed += 1;
  }
  return pushed;
}

async function claimSync(prisma: PrismaClient, workerId: string): Promise<any | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "MarketingSyncRun" WHERE status IN ('QUEUED','RETRY_WAIT') AND "availableAt" <= (clock_timestamp() AT TIME ZONE 'UTC') ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!rows[0]) return null;
    await tx.marketingSyncRun.update({ where: { id: rows[0].id }, data: { status: 'RUNNING', attempt: { increment: 1 }, leaseOwner: workerId, leaseExpiresAt: new Date(Date.now() + 120_000), startedAt: new Date() } });
    return tx.marketingSyncRun.findUnique({ where: { id: rows[0].id }, include: { connection: true } });
  });
}

export async function processSourceSyncs(prisma: PrismaClient, workerId = `source-sync-${process.pid}`): Promise<{ completed: number; failed: number; retried: number }> {
  const totals = { completed: 0, failed: 0, retried: 0 };
  for (let count = 0; count < 10; count += 1) {
    const run = await claimSync(prisma, workerId);
    if (!run) break;
    try {
      const config = decryptConnectorConfig<ConnectorConfig>(run.connection.configEncrypted);
      let pulled = 0; let deduplicated = 0; let deleted = 0; let cursor = run.connection.cursor;
      if (['PULL', 'BIDIRECTIONAL'].includes(run.direction)) {
        const page = await pullPage(config, run.connection.kind, cursor);
        for (const record of page.records) {
          if (['CONSENT', 'SUPPRESSION'].includes(run.connection.kind)) await applyGovernanceRecord(prisma, run, run.connection, record);
          else {
            const outcome = await upsertCustomerRecord(prisma, run, run.connection, record);
            if (outcome === 'pulled') pulled += 1; else deduplicated += 1;
          }
        }
        for (const externalId of page.deletedExternalIds) {
          const mapping = await prisma.contactSourceMapping.findUnique({ where: { connectionId_externalId: { connectionId: run.connection.id, externalId } } });
          if (mapping) {
            await prisma.$transaction([
              prisma.contactSourceMapping.update({ where: { id: mapping.id }, data: { deletedAt: new Date(), lastSyncedAt: new Date() } }),
              prisma.contact.update({ where: { id: mapping.contactId }, data: { status: 'INACTIVE' } }),
            ]);
            deleted += 1;
          }
        }
        cursor = page.nextCursor;
      }
      const pushed = await pushChanges(prisma, run, run.connection, config);
      await prisma.$transaction([
        prisma.marketingSyncRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', cursorAfter: cursor, pulled, pushed, deduplicated, deleted, completedAt: new Date(), leaseOwner: null, leaseExpiresAt: null } }),
        prisma.sourceConnection.update({ where: { id: run.connection.id }, data: { cursor, lastSyncAt: new Date(), lastError: null, status: 'ACTIVE' } }),
      ]);
      totals.completed += 1;
    } catch (rawError: any) {
      const retryable = Boolean(rawError?.retryable) || /timeout|429|ECONN|HTTP 5/i.test(String(rawError?.message || rawError));
      const status = retryable && run.attempt < run.maxAttempts ? 'RETRY_WAIT' : retryable ? 'DEAD_LETTER' : 'FAILED';
      const error = { code: rawError?.code || 'SYNC_FAILED', message: String(rawError?.message || rawError).slice(0, 1_000), retryable };
      await prisma.$transaction([
        prisma.marketingSyncRun.update({ where: { id: run.id }, data: { status, error, availableAt: new Date(Date.now() + Math.min(600_000, 10_000 * 2 ** Math.max(0, run.attempt - 1))), leaseOwner: null, leaseExpiresAt: null, completedAt: status === 'RETRY_WAIT' ? null : new Date() } }),
        prisma.sourceConnection.update({ where: { id: run.connection.id }, data: { status: 'ERROR', lastError: error.message } }),
      ]);
      if (status === 'RETRY_WAIT') totals.retried += 1; else totals.failed += 1;
    }
  }
  return totals;
}
