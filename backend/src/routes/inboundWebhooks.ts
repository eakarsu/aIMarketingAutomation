import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const { verifySendGridSignature, verifyTwilioSignature, eventDigest } = require('../governance/webhookSecurity.cjs');
const router = Router();

async function analyticsIncrement(prisma: PrismaClient, campaignId: string, field: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed') {
  const analytics = await prisma.campaignAnalytics.findFirst({ where: { campaignId }, orderBy: { recordedAt: 'desc' } });
  if (analytics) await prisma.campaignAnalytics.update({ where: { id: analytics.id }, data: { [field]: { increment: 1 } } });
  else await prisma.campaignAnalytics.create({ data: { campaignId, [field]: 1 } });
}

async function suppressContact(prisma: PrismaClient, job: any, reason: 'OPT_OUT' | 'HARD_BOUNCE' | 'COMPLAINT') {
  const channel = job.channel;
  const identity = channel === 'SMS' ? job.contact.phone : job.contact.email;
  if (!identity) return;
  const identityHash = crypto.createHash('sha256').update(`${String(identity).toLowerCase()}:${channel}`).digest('hex');
  await prisma.suppressionEntry.upsert({
    where: { userId_identityHash_channel: { userId: job.userId, identityHash, channel } },
    create: { userId: job.userId, contactId: job.contactId, identityHash, channel, reason, region: job.contact.region, source: `provider:${job.provider}` },
    update: { active: true, reason, revokedAt: null, contactId: job.contactId },
  } as any);
  await prisma.contact.update({ where: { id: job.contactId }, data: { status: reason === 'HARD_BOUNCE' ? 'BOUNCED' : 'UNSUBSCRIBED', optedOutAt: reason === 'HARD_BOUNCE' ? undefined : new Date() } });
}

async function recordEvent(prisma: PrismaClient, input: { provider: string; eventId: string; eventType: string; payload: unknown; signature: string; job: any }) {
  try {
    return await prisma.webhookDelivery.create({ data: {
      provider: input.provider, eventId: input.eventId, eventType: input.eventType,
      payloadDigest: eventDigest(input.payload), signatureDigest: eventDigest(input.signature), deliveryJobId: input.job?.id || null,
    } });
  } catch (error: any) {
    if (error?.code === 'P2002') return null;
    throw error;
  }
}

router.post('/sendgrid', async (req: Request, res: Response) => {
  const timestamp = String(req.header('x-twilio-email-event-webhook-timestamp') || '');
  const signature = String(req.header('x-twilio-email-event-webhook-signature') || '');
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!verifySendGridSignature({ publicKey: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY, timestamp, signature, rawBody })) return res.status(401).json({ error: 'Invalid SendGrid signature' });
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let processed = 0; let duplicates = 0;
    for (const event of events) {
      const providerMessageId = String(event.sg_message_id || event.smtp_id || '').split('.')[0];
      const job = await prisma.deliveryJob.findFirst({
        where: event.delivery_job_id ? { id: String(event.delivery_job_id) } : { providerMessageId },
        include: { contact: true },
      });
      if (!job) continue;
      const type = String(event.event || '').toLowerCase();
      const eventId = String(event.sg_event_id || event.event_id || eventDigest({ providerMessageId, type, timestamp: event.timestamp }));
      const delivery = await recordEvent(prisma, { provider: 'sendgrid', eventId, eventType: type, payload: event, signature, job });
      if (!delivery) { duplicates += 1; continue; }
      const recipientWhere = { campaignId_contactId: { campaignId: job.campaignId, contactId: job.contactId } };
      if (type === 'delivered') { await prisma.campaignRecipient.update({ where: recipientWhere, data: { status: 'DELIVERED' } }); await analyticsIncrement(prisma, job.campaignId, 'delivered'); }
      else if (type === 'open') { await prisma.campaignRecipient.update({ where: recipientWhere, data: { status: 'OPENED', openedAt: new Date(Number(event.timestamp || Date.now() / 1000) * 1000) } }); await analyticsIncrement(prisma, job.campaignId, 'opened'); }
      else if (type === 'click') { await prisma.campaignRecipient.update({ where: recipientWhere, data: { status: 'CLICKED', clickedAt: new Date(Number(event.timestamp || Date.now() / 1000) * 1000) } }); await analyticsIncrement(prisma, job.campaignId, 'clicked'); }
      else if (['bounce', 'dropped'].includes(type)) { await prisma.campaignRecipient.update({ where: recipientWhere, data: { status: 'BOUNCED', bouncedAt: new Date() } }); await analyticsIncrement(prisma, job.campaignId, 'bounced'); await suppressContact(prisma, job, 'HARD_BOUNCE'); }
      else if (['unsubscribe', 'spamreport'].includes(type)) { await prisma.campaignRecipient.update({ where: recipientWhere, data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() } }); await analyticsIncrement(prisma, job.campaignId, 'unsubscribed'); await suppressContact(prisma, job, type === 'spamreport' ? 'COMPLAINT' : 'OPT_OUT'); }
      else { await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { processedAt: new Date() } }); continue; }
      await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { processedAt: new Date() } });
      processed += 1;
    }
    res.json({ processed, duplicates });
  } catch (error) {
    console.error('[sendgrid webhook]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/twilio', async (req: Request, res: Response) => {
  const signature = String(req.header('x-twilio-signature') || '');
  const publicBase = process.env.WEBHOOK_PUBLIC_BASE_URL;
  if (!publicBase) return res.status(503).json({ error: 'Webhook public URL is not configured' });
  const url = `${publicBase.replace(/\/$/, '')}${req.originalUrl}`;
  if (!verifyTwilioSignature({ authToken: process.env.TWILIO_AUTH_TOKEN, url, params: req.body, signature })) return res.status(401).json({ error: 'Invalid Twilio signature' });
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const providerMessageId = String(req.body.MessageSid || '');
    const deliveryJobId = String(req.query.deliveryJobId || '');
    const job = await prisma.deliveryJob.findFirst({ where: deliveryJobId ? { id: deliveryJobId } : { provider: 'twilio', providerMessageId }, include: { contact: true } });
    if (!job) return res.json({ processed: 0 });
    const type = String(req.body.MessageStatus || '').toLowerCase();
    const eventId = `${providerMessageId}:${type}`;
    const delivery = await recordEvent(prisma, { provider: 'twilio', eventId, eventType: type, payload: req.body, signature, job });
    if (!delivery) return res.json({ processed: 0, duplicate: true });
    const where = { campaignId_contactId: { campaignId: job.campaignId, contactId: job.contactId } };
    if (type === 'delivered') { await prisma.campaignRecipient.update({ where, data: { status: 'DELIVERED' } }); await analyticsIncrement(prisma, job.campaignId, 'delivered'); }
    else if (['failed', 'undelivered'].includes(type)) await prisma.campaignRecipient.update({ where, data: { status: 'FAILED' } });
    else if (type === 'sent') await prisma.campaignRecipient.update({ where, data: { status: 'SENT', sentAt: new Date() } });
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { processedAt: new Date() } });
    res.json({ processed: 1 });
  } catch (error) {
    console.error('[twilio webhook]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
