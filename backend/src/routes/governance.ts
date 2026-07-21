import crypto from 'node:crypto';
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const { transitionLead, attributeConversion, measureDataQuality } = require('../governance/core.cjs');
const router = Router();
router.use(authMiddleware);

router.post('/contacts/:contactId/consent-events', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const contact = await prisma.contact.findFirst({ where: { id: req.params.contactId, userId: req.userId } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const { channel, status, lawfulBasis, source, evidence, occurredAt, privacyNoticeAt, expiresAt } = req.body;
  if (!['EMAIL', 'SMS'].includes(channel) || !['GRANTED', 'DENIED', 'REVOKED', 'EXPIRED'].includes(status) || !source || !evidence) return res.status(422).json({ error: 'channel, status, source, and evidence are required' });
  const event = await prisma.consentEvent.create({ data: {
    userId: req.userId!, contactId: contact.id, channel, status, lawfulBasis: lawfulBasis || 'NOT_APPLICABLE', source: String(source).slice(0, 200),
    evidenceDigest: crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex'), occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    privacyNoticeAt: privacyNoticeAt ? new Date(privacyNoticeAt) : null, expiresAt: expiresAt ? new Date(expiresAt) : null,
  } as any });
  if (['DENIED', 'REVOKED'].includes(status)) await prisma.contact.update({ where: { id: contact.id }, data: { optedOutAt: new Date(), status: 'UNSUBSCRIBED' } });
  res.status(201).json(event);
});

router.post('/contacts/:contactId/suppressions', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const contact = await prisma.contact.findFirst({ where: { id: req.params.contactId, userId: req.userId } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const channel = ['ALL', 'EMAIL', 'SMS'].includes(req.body.channel) ? req.body.channel : 'ALL';
  const reason = req.body.reason;
  if (!['OPT_OUT', 'HARD_BOUNCE', 'COMPLAINT', 'LEGAL_REQUEST', 'INVALID_ADDRESS', 'MANUAL'].includes(reason)) return res.status(422).json({ error: 'valid suppression reason is required' });
  const identity = channel === 'SMS' ? contact.phone : contact.email;
  if (!identity) return res.status(422).json({ error: `contact has no ${channel.toLowerCase()} identity` });
  const identityHash = crypto.createHash('sha256').update(`${String(identity).toLowerCase()}:${channel}`).digest('hex');
  const suppression = await prisma.suppressionEntry.upsert({
    where: { userId_identityHash_channel: { userId: req.userId!, identityHash, channel } },
    create: { userId: req.userId!, contactId: contact.id, identityHash, channel, reason, region: contact.region, source: 'manual-api' },
    update: { active: true, reason, revokedAt: null, contactId: contact.id },
  } as any);
  await prisma.contact.update({ where: { id: contact.id }, data: { optedOutAt: new Date(), status: 'UNSUBSCRIBED' } });
  res.status(201).json(suppression);
});

router.post('/suppressions/:id/revoke', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const suppression = await prisma.suppressionEntry.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!suppression) return res.status(404).json({ error: 'Suppression not found' });
  res.json(await prisma.suppressionEntry.update({ where: { id: suppression.id }, data: { active: false, revokedAt: new Date() } }));
});

router.post('/contacts/:contactId/lead', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const contact = await prisma.contact.findFirst({ where: { id: req.params.contactId, userId: req.userId } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const lead = await prisma.leadRecord.upsert({ where: { contactId: contact.id }, create: { userId: req.userId!, contactId: contact.id, ownerId: req.body.ownerId || null }, update: {} });
  res.status(201).json(lead);
});

router.post('/leads/:id/transitions', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const lead = await prisma.leadRecord.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const conversion = req.body.conversionId ? await prisma.conversion.findFirst({ where: { id: req.body.conversionId, userId: req.userId, contactId: lead.contactId } }) : null;
    if (req.body.conversionId && !conversion) return res.status(422).json({ error: 'Conversion evidence does not belong to this lead' });
    const salesApproval = req.body.to === 'SALES_ACCEPTED' && req.body.approvalId ? { id: req.body.approvalId, decision: 'APPROVED' } : undefined;
    const next = transitionLead(lead, { ...req.body, actorId: req.userId, approval: salesApproval });
    const changed = await prisma.leadRecord.updateMany({ where: { id: lead.id, version: lead.version }, data: { state: next.state, ownerId: next.ownerId, handoffStatus: next.handoffStatus, retryAt: next.retryAt ? new Date(next.retryAt) : null, version: { increment: 1 } } });
    if (!changed.count) return res.status(409).json({ error: 'Lead changed concurrently; reload and retry' });
    const transition = await prisma.leadTransition.create({ data: { leadId: lead.id, fromState: lead.state, toState: next.state, reason: req.body.reason, actorId: req.userId!, approvalId: salesApproval?.id || null, conversionId: conversion?.id || null } });
    res.status(201).json({ lead: await prisma.leadRecord.findUnique({ where: { id: lead.id } }), transition });
  } catch (error: any) {
    res.status(error.status || 422).json({ error: error.message, code: error.code || 'INVALID_TRANSITION' });
  }
});

router.post('/campaigns/:id/approval-request', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (!['DRAFT', 'PAUSED'].includes(campaign.status)) return res.status(409).json({ error: 'Only draft or paused campaigns can request approval' });
  const approval = await prisma.outreachApproval.upsert({
    where: { campaignId: campaign.id },
    create: { campaignId: campaign.id, requestedBy: req.userId!, status: 'PENDING', attestations: req.body.attestations || {} },
    update: { requestedBy: req.userId!, status: 'PENDING', attestations: req.body.attestations || {}, reviewedBy: null, decidedAt: null, comment: null, requestedAt: new Date() },
  });
  await prisma.campaign.update({ where: { id: campaign.id }, data: { approvalStatus: 'PENDING' } });
  res.status(201).json(approval);
});

router.post('/campaigns/:id/approval-decision', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { outreachApproval: true } });
  if (!campaign?.outreachApproval) return res.status(404).json({ error: 'Pending approval not found' });
  if (!['APPROVED', 'REJECTED'].includes(req.body.decision)) return res.status(422).json({ error: 'decision must be APPROVED or REJECTED' });
  const attestations = req.body.attestations || {};
  if (req.body.decision === 'APPROVED' && (!attestations.privacyReviewed || !attestations.deliverabilityReviewed)) return res.status(422).json({ error: 'privacyReviewed and deliverabilityReviewed attestations are required' });
  const approval = await prisma.outreachApproval.update({ where: { id: campaign.outreachApproval.id }, data: { status: req.body.decision, reviewedBy: req.userId!, attestations, comment: req.body.comment || null, decidedAt: new Date() } });
  await prisma.campaign.update({ where: { id: campaign.id }, data: { approvalStatus: req.body.decision } });
  res.json(approval);
});

router.get('/campaigns/:id/delivery-jobs', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: req.userId }, select: { id: true, approvalStatus: true, outreachApproval: true } });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const jobs = await prisma.deliveryJob.findMany({ where: { campaignId: campaign.id }, include: { attempts: { orderBy: { attempt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 500 });
  res.json({ approvalStatus: campaign.approvalStatus, approval: campaign.outreachApproval, jobs });
});

router.post('/delivery-jobs/:id/cancel', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const job = await prisma.deliveryJob.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!job) return res.status(404).json({ error: 'Delivery job not found' });
  if (!['QUEUED', 'RETRY_WAIT'].includes(job.status)) return res.status(409).json({ error: 'Only pending jobs can be cancelled' });
  res.json(await prisma.deliveryJob.update({ where: { id: job.id }, data: { status: 'CANCELLED', cancelRequestedAt: new Date() } }));
});

router.post('/delivery-jobs/:id/retry', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const job = await prisma.deliveryJob.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!job) return res.status(404).json({ error: 'Delivery job not found' });
  if (!['FAILED', 'DEAD_LETTER'].includes(job.status)) return res.status(409).json({ error: 'Only failed jobs can be retried' });
  res.json(await prisma.deliveryJob.update({ where: { id: job.id }, data: { status: 'RETRY_WAIT', attempt: 0, availableAt: new Date(), error: undefined, cancelRequestedAt: null } }));
});

router.post('/conversions', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { contactId, externalId, type, value, currency, occurredAt, model = 'LINEAR' } = req.body;
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: req.userId } });
  if (!contact || !externalId || !type || !occurredAt) return res.status(422).json({ error: 'owned contactId, externalId, type, and occurredAt are required' });
  const existing = await prisma.conversion.findUnique({ where: { userId_externalId: { userId: req.userId!, externalId } } });
  if (existing) return res.json(existing);
  const touches = await prisma.attributionTouch.findMany({ where: { userId: req.userId, contactId, occurredAt: { lte: new Date(occurredAt) } }, orderBy: { occurredAt: 'asc' } });
  const draft = { contactId, occurredAt };
  const credits = attributeConversion(touches, draft, model);
  const conversion = await prisma.conversion.create({ data: { userId: req.userId!, contactId, externalId, type, value, currency, occurredAt: new Date(occurredAt), credits: { create: credits.map((credit: any) => ({ touchId: credit.touchId, model, credit: credit.credit })) } }, include: { credits: true } });
  res.status(201).json(conversion);
});

router.get('/data-quality', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const contacts = await prisma.contact.findMany({ where: { userId: req.userId }, include: { consentEvents: { orderBy: { occurredAt: 'desc' }, take: 1 }, leadRecord: true } });
  const report = measureDataQuality(contacts.map((contact) => ({ email: contact.email, consentStatus: contact.consentEvents[0]?.status, ownerId: contact.leadRecord?.ownerId })));
  res.json({ measuredAt: new Date().toISOString(), ...report });
});

export default router;

