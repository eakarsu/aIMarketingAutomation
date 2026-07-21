'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const enabled = Boolean(process.env.DATABASE_URL);
let prisma;
let sendCampaignNow;
let processDeliveryJobs;
let fixture;

test.before(async () => {
  if (!enabled) return;
  const { PrismaClient } = require('@prisma/client');
  ({ sendCampaignNow, processDeliveryJobs } = require('../../dist/services/sendExecutor.js'));
  prisma = new PrismaClient();
  const suffix = crypto.randomUUID();
  const user = await prisma.user.create({ data: { email: `workflow-${suffix}@example.test`, password: 'not-a-real-login-hash', firstName: 'Workflow', lastName: 'Test', role: 'ADMIN' } });
  const contact = await prisma.contact.create({ data: { userId: user.id, email: `contact-${suffix}@example.test`, firstName: 'Ada', region: 'EU', timezoneOffsetMinutes: 0 } });
  await prisma.consentEvent.create({ data: { userId: user.id, contactId: contact.id, channel: 'EMAIL', status: 'GRANTED', lawfulBasis: 'EXPLICIT_CONSENT', source: 'e2e-contract', evidenceDigest: crypto.createHash('sha256').update(suffix).digest('hex'), occurredAt: new Date() } });
  const campaign = await prisma.campaign.create({ data: {
    userId: user.id, name: 'Governed production journey', type: 'EMAIL', status: 'DRAFT', subject: 'Verified subject', content: 'Verified body',
    domainAuth: { spf: true, dkim: true, dmarc: true }, quietHours: { start: 1, end: 1 }, aiGenerated: true, approvalStatus: 'APPROVED',
  } });
  await prisma.outreachApproval.create({ data: { campaignId: campaign.id, status: 'APPROVED', requestedBy: user.id, reviewedBy: user.id, attestations: { privacyReviewed: true, deliverabilityReviewed: true }, decidedAt: new Date() } });
  fixture = { user, contact, campaign, suffix };
});

test.after(async () => { if (prisma) await prisma.$disconnect(); });

test('database journey queues once and never simulates provider delivery', { skip: !enabled }, async () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_FROM;
  const first = await sendCampaignNow(prisma, fixture.campaign.id, fixture.user.id);
  const second = await sendCampaignNow(prisma, fixture.campaign.id, fixture.user.id);
  assert.deepEqual({ queued: first.queued, blocked: first.blocked, total: first.total }, { queued: 1, blocked: 0, total: 1 });
  assert.equal(second.existing, 1);
  const allJobs = await prisma.$queryRawUnsafe(`SELECT id, status, "availableAt", "cancelRequestedAt", clock_timestamp() AS now, status IN ('QUEUED','RETRY_WAIT') AS status_ok, "availableAt" <= (clock_timestamp() AT TIME ZONE 'UTC') AS time_ok, "cancelRequestedAt" IS NULL AS cancel_ok FROM "DeliveryJob"`);
  const eligible = await prisma.$queryRawUnsafe(`SELECT id FROM "DeliveryJob" WHERE status IN ('QUEUED','RETRY_WAIT') AND "availableAt" <= (clock_timestamp() AT TIME ZONE 'UTC') AND "cancelRequestedAt" IS NULL`);
  assert.equal(eligible.length, 1, JSON.stringify(allJobs));
  const worker = await processDeliveryJobs(prisma, 'database-workflow-test');
  assert.equal(worker.failed, 1, JSON.stringify(worker));
  const job = await prisma.deliveryJob.findFirstOrThrow({ where: { campaignId: fixture.campaign.id } });
  const recipient = await prisma.campaignRecipient.findUniqueOrThrow({ where: { campaignId_contactId: { campaignId: fixture.campaign.id, contactId: fixture.contact.id } } });
  assert.equal(job.status, 'FAILED');
  assert.equal(job.providerMessageId, null);
  assert.equal(job.sentAt, null);
  assert.equal(recipient.status, 'FAILED');
  assert.equal(recipient.sentAt, null);
});

test('lead ownership, handoff, conversion evidence, and attribution persist', { skip: !enabled }, async () => {
  const lead = await prisma.leadRecord.create({ data: { userId: fixture.user.id, contactId: fixture.contact.id } });
  const transitions = [
    ['NEW', 'QUALIFIED'], ['QUALIFIED', 'ASSIGNED'], ['ASSIGNED', 'ENGAGED'], ['ENGAGED', 'SALES_ACCEPTED'],
  ];
  for (const [fromState, toState] of transitions) {
    await prisma.$transaction([
      prisma.leadRecord.update({ where: { id: lead.id }, data: { state: toState, ownerId: fixture.user.id, handoffStatus: toState === 'SALES_ACCEPTED' ? 'ACCEPTED' : 'PENDING', version: { increment: 1 } } }),
      prisma.leadTransition.create({ data: { leadId: lead.id, fromState, toState, reason: `e2e ${toState}`, actorId: fixture.user.id, approvalId: toState === 'SALES_ACCEPTED' ? `approval-${fixture.suffix}` : null } }),
    ]);
  }
  const touch = await prisma.attributionTouch.create({ data: { userId: fixture.user.id, contactId: fixture.contact.id, campaignId: fixture.campaign.id, channel: 'EMAIL', eventType: 'CLICK', externalId: `touch-${fixture.suffix}`, occurredAt: new Date(Date.now() - 1_000) } });
  const conversion = await prisma.conversion.create({ data: { userId: fixture.user.id, contactId: fixture.contact.id, externalId: `conversion-${fixture.suffix}`, type: 'PURCHASE', value: '125.00', currency: 'USD', occurredAt: new Date(), credits: { create: { touchId: touch.id, model: 'LAST_TOUCH', credit: 1 } } }, include: { credits: true } });
  await prisma.$transaction([
    prisma.leadRecord.update({ where: { id: lead.id }, data: { state: 'CONVERTED', version: { increment: 1 } } }),
    prisma.leadTransition.create({ data: { leadId: lead.id, fromState: 'SALES_ACCEPTED', toState: 'CONVERTED', reason: 'durable conversion evidence', actorId: fixture.user.id, conversionId: conversion.id } }),
  ]);
  const persisted = await prisma.leadRecord.findUniqueOrThrow({ where: { id: lead.id }, include: { transitions: true } });
  assert.equal(persisted.state, 'CONVERTED');
  assert.equal(persisted.handoffStatus, 'ACCEPTED');
  assert.equal(persisted.transitions.length, 5);
  assert.equal(conversion.credits[0].credit.toString(), '1');
});

test('source sync runs are durable and tenant-idempotent', { skip: !enabled }, async () => {
  const connection = await prisma.sourceConnection.create({ data: { userId: fixture.user.id, name: 'E2E CRM', kind: 'CRM', direction: 'BIDIRECTIONAL', status: 'ACTIVE', configEncrypted: 'fixture-never-decrypted' } });
  const idempotencyKey = `sync-${fixture.suffix}`;
  const first = await prisma.marketingSyncRun.upsert({ where: { userId_idempotencyKey: { userId: fixture.user.id, idempotencyKey } }, create: { userId: fixture.user.id, connectionId: connection.id, direction: 'BIDIRECTIONAL', idempotencyKey }, update: {} });
  const second = await prisma.marketingSyncRun.upsert({ where: { userId_idempotencyKey: { userId: fixture.user.id, idempotencyKey } }, create: { userId: fixture.user.id, connectionId: connection.id, direction: 'BIDIRECTIONAL', idempotencyKey }, update: {} });
  assert.equal(first.id, second.id);
  assert.equal(await prisma.marketingSyncRun.count({ where: { userId: fixture.user.id, idempotencyKey } }), 1);
});
