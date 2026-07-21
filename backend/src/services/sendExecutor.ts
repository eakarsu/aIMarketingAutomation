import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

type QueueResult = { queued: number; blocked: number; existing: number; total: number; blockers: Record<string, number> };

let mailer: nodemailer.Transporter | null = null;
let smsClient: ReturnType<typeof twilio> | null = null;

function jsonObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function providerError(code: string, message: string, retryable: boolean): Error & { code: string; retryable: boolean } {
  return Object.assign(new Error(message), { code, retryable });
}

function getMailer(): nodemailer.Transporter {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw providerError('EMAIL_PROVIDER_NOT_CONFIGURED', 'SMTP_HOST and SMTP_FROM are required; no simulated delivery is recorded', false);
  }
  if (!mailer) {
    mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return mailer;
}

function getSmsClient(): ReturnType<typeof twilio> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    throw providerError('SMS_PROVIDER_NOT_CONFIGURED', 'Twilio credentials and TWILIO_FROM_NUMBER are required; no simulated delivery is recorded', false);
  }
  if (!smsClient) smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return smsClient;
}

function localHour(now: Date, offsetMinutes: number): number {
  return ((now.getUTCHours() + Math.trunc(offsetMinutes / 60)) % 24 + 24) % 24;
}

function inQuietHours(hour: number, quietHours: Record<string, any>): boolean {
  const start = Number.isInteger(quietHours.start) ? quietHours.start : 21;
  const end = Number.isInteger(quietHours.end) ? quietHours.end : 8;
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

async function policyFor(prisma: PrismaClient, campaign: any, contact: any, recipientCount: number) {
  const channel = campaign.type === 'EMAIL' ? 'EMAIL' : campaign.type === 'SMS' ? 'SMS' : null;
  const reasons: string[] = [];
  if (!channel) reasons.push('UNSUPPORTED_CHANNEL');
  if (contact.status !== 'ACTIVE') reasons.push('CONTACT_NOT_ACTIVE');
  if (contact.optedOutAt) reasons.push('CONTACT_OPTED_OUT');
  if (channel === 'EMAIL' && !contact.email) reasons.push('EMAIL_REQUIRED');
  if (channel === 'SMS' && !contact.phone) reasons.push('PHONE_REQUIRED');

  const [consent, suppression, tenantSentToday, contactSentLast7Days, analytics] = await Promise.all([
    channel ? prisma.consentEvent.findFirst({ where: { userId: campaign.userId, contactId: contact.id, channel: channel as any }, orderBy: { occurredAt: 'desc' } }) : null,
    channel ? prisma.suppressionEntry.findFirst({ where: { userId: campaign.userId, contactId: contact.id, active: true, channel: { in: ['ALL', channel] } } }) : null,
    prisma.deliveryJob.count({ where: { userId: campaign.userId, status: 'SENT', sentAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.deliveryJob.count({ where: { contactId: contact.id, status: 'SENT', sentAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.campaignAnalytics.aggregate({ where: { campaign: { userId: campaign.userId } }, _sum: { totalSent: true, bounced: true } }),
  ]);

  if (!consent || consent.status !== 'GRANTED' || (consent.expiresAt && consent.expiresAt <= new Date())) reasons.push('CONSENT_NOT_GRANTED');
  if (suppression) reasons.push('SUPPRESSED');
  if (['EU', 'UK'].includes(contact.region) && consent?.lawfulBasis !== 'EXPLICIT_CONSENT') reasons.push('EXPLICIT_CONSENT_REQUIRED');
  if (contact.region === 'CA' && !consent?.privacyNoticeAt) reasons.push('PRIVACY_NOTICE_REQUIRED');
  const domainAuth = jsonObject(campaign.domainAuth);
  if (channel === 'EMAIL' && (!domainAuth.spf || !domainAuth.dkim || !domainAuth.dmarc)) reasons.push('DOMAIN_AUTH_REQUIRED');
  const sent = analytics._sum.totalSent || 0;
  if (sent >= 100 && (analytics._sum.bounced || 0) / sent > 0.05) reasons.push('BOUNCE_RATE_TOO_HIGH');
  const dailyLimit = Number(process.env.OUTREACH_DAILY_LIMIT || 10_000);
  if (tenantSentToday >= dailyLimit) reasons.push('TENANT_RATE_LIMIT');
  if (contactSentLast7Days >= campaign.frequencyCap7Days) reasons.push('FREQUENCY_CAP');
  if (inQuietHours(localHour(new Date(), contact.timezoneOffsetMinutes || 0), jsonObject(campaign.quietHours))) reasons.push('QUIET_HOURS');
  const reviewRequired = Boolean(campaign.aiGenerated || campaign.sensitiveSegment || recipientCount > 1_000);
  if (reviewRequired && campaign.approvalStatus !== 'APPROVED') reasons.push('HUMAN_APPROVAL_REQUIRED');
  return {
    channel,
    allowed: reasons.length === 0,
    reasons,
    evaluatedAt: new Date().toISOString(),
    evidence: { consentId: consent?.id || null, suppressionId: suppression?.id || null, tenantSentToday, contactSentLast7Days, reviewRequired },
  };
}

export async function sendCampaignNow(prisma: PrismaClient, campaignId: string, userId: string): Promise<QueueResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { segment: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!campaign) throw new Error('Campaign not found');
  if (!['EMAIL', 'SMS'].includes(campaign.type)) throw new Error('Only EMAIL and SMS campaigns can enter the governed delivery queue');
  const contacts = campaign.segment
    ? campaign.segment.contacts.map((entry) => entry.contact)
    : await prisma.contact.findMany({ where: { userId, status: 'ACTIVE' } });
  const result: QueueResult = { queued: 0, blocked: 0, existing: 0, total: contacts.length, blockers: {} };

  for (const contact of contacts) {
    const policy = await policyFor(prisma, campaign, contact, contacts.length);
    if (!policy.allowed || !policy.channel) {
      result.blocked += 1;
      for (const reason of policy.reasons) result.blockers[reason] = (result.blockers[reason] || 0) + 1;
      continue;
    }
    const recipient = await prisma.campaignRecipient.upsert({
      where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
      update: {},
      create: { campaignId: campaign.id, contactId: contact.id, status: 'PENDING' },
    });
    const idempotencyKey = crypto.createHash('sha256').update(`${campaign.id}:${contact.id}:${policy.channel}:v1`).digest('hex');
    const existing = await prisma.deliveryJob.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
    if (existing) {
      result.existing += 1;
      continue;
    }
    await prisma.deliveryJob.create({ data: { userId, campaignId: campaign.id, contactId: contact.id, channel: policy.channel as any, policyDecision: policy, idempotencyKey } });
    if (recipient.status !== 'PENDING') await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'PENDING' } });
    result.queued += 1;
  }
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: result.queued || result.existing ? 'SENDING' : 'PAUSED' } });
  return result;
}

export async function dispatchScheduledCampaigns(prisma: PrismaClient): Promise<{ campaignsProcessed: number; recipientsQueued: number; recipientsBlocked: number }> {
  const campaigns = await prisma.campaign.findMany({ where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } }, take: 20 });
  let recipientsQueued = 0;
  let recipientsBlocked = 0;
  for (const campaign of campaigns) {
    try {
      const result = await sendCampaignNow(prisma, campaign.id, campaign.userId);
      recipientsQueued += result.queued;
      recipientsBlocked += result.blocked;
    } catch (error) {
      console.error('[delivery queue] campaign enqueue failed', campaign.id, error);
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } }).catch(() => undefined);
    }
  }
  return { campaignsProcessed: campaigns.length, recipientsQueued, recipientsBlocked };
}

async function claimJob(prisma: PrismaClient, workerId: string): Promise<any | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "DeliveryJob" WHERE status IN ('QUEUED','RETRY_WAIT') AND "availableAt" <= (clock_timestamp() AT TIME ZONE 'UTC') AND "cancelRequestedAt" IS NULL ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    if (!rows[0]) return null;
    await tx.deliveryJob.update({ where: { id: rows[0].id }, data: { status: 'RUNNING', attempt: { increment: 1 }, leaseOwner: workerId, leaseExpiresAt: new Date(Date.now() + 60_000) } });
    return tx.deliveryJob.findUnique({ where: { id: rows[0].id }, include: { campaign: true, contact: true } });
  });
}

async function refreshCampaignState(prisma: PrismaClient, campaignId: string): Promise<void> {
  const pending = await prisma.deliveryJob.count({ where: { campaignId, status: { in: ['QUEUED', 'RUNNING', 'RETRY_WAIT'] } } });
  if (pending) return;
  const sent = await prisma.deliveryJob.count({ where: { campaignId, status: 'SENT' } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: sent ? 'SENT' : 'PAUSED', sentAt: sent ? new Date() : null } });
  const existing = await prisma.campaignAnalytics.findFirst({ where: { campaignId }, orderBy: { recordedAt: 'desc' } });
  if (existing) await prisma.campaignAnalytics.update({ where: { id: existing.id }, data: { totalSent: sent } });
  else await prisma.campaignAnalytics.create({ data: { campaignId, totalSent: sent } });
}

export async function processDeliveryJobs(prisma: PrismaClient, workerId = `delivery-${process.pid}`): Promise<{ processed: number; sent: number; failed: number; retried: number }> {
  const totals = { processed: 0, sent: 0, failed: 0, retried: 0 };
  for (let count = 0; count < 50; count += 1) {
    const job = await claimJob(prisma, workerId);
    if (!job) break;
    totals.processed += 1;
    const requestDigest = crypto.createHash('sha256').update(`${job.campaignId}:${job.contactId}:${job.attempt}`).digest('hex');
    await prisma.deliveryAttempt.create({ data: { deliveryJobId: job.id, attempt: job.attempt, provider: job.channel === 'EMAIL' ? 'smtp' : 'twilio', requestDigest, status: 'STARTED' } });
    try {
      let provider: string;
      let providerMessageId: string;
      let receipt: Record<string, unknown>;
      if (job.channel === 'EMAIL') {
        const info = await getMailer().sendMail({
          from: process.env.SMTP_FROM!, to: job.contact.email, subject: job.campaign.subject || job.campaign.name,
          text: job.campaign.content || '', html: job.campaign.htmlContent || job.campaign.content || '',
          headers: { 'X-Campaign-ID': job.campaignId, 'X-Delivery-Job-ID': job.id },
        });
        if (!info.messageId) throw providerError('PROVIDER_RECEIPT_MISSING', 'SMTP accepted without a message ID', true);
        provider = 'smtp'; providerMessageId = info.messageId; receipt = { accepted: info.accepted, rejected: info.rejected, response: info.response };
      } else {
        const callbackBase = process.env.WEBHOOK_PUBLIC_BASE_URL;
        if (!callbackBase) throw providerError('CALLBACK_URL_NOT_CONFIGURED', 'WEBHOOK_PUBLIC_BASE_URL is required for delivery receipts', false);
        const message = await getSmsClient().messages.create({
          to: job.contact.phone!, from: process.env.TWILIO_FROM_NUMBER!, body: job.campaign.content || job.campaign.subject || job.campaign.name,
          statusCallback: `${callbackBase.replace(/\/$/, '')}/api/inbound-webhooks/twilio?deliveryJobId=${encodeURIComponent(job.id)}`,
        });
        provider = 'twilio'; providerMessageId = message.sid; receipt = { status: message.status, dateCreated: message.dateCreated };
      }
      await prisma.$transaction([
        prisma.deliveryJob.update({ where: { id: job.id }, data: { status: 'SENT', provider, providerMessageId, providerReceipt: receipt as any, sentAt: new Date(), leaseOwner: null, leaseExpiresAt: null } }),
        prisma.deliveryAttempt.update({ where: { deliveryJobId_attempt: { deliveryJobId: job.id, attempt: job.attempt } }, data: { status: 'PROVIDER_ACCEPTED', providerMessageId, completedAt: new Date() } }),
        prisma.campaignRecipient.update({ where: { campaignId_contactId: { campaignId: job.campaignId, contactId: job.contactId } }, data: { status: 'SENT', sentAt: new Date() } }),
      ]);
      totals.sent += 1;
    } catch (rawError: any) {
      const retryable = Boolean(rawError?.retryable) || /timeout|temporar|429|rate|ECONN|5\d\d/i.test(String(rawError?.message || rawError));
      const nextStatus = retryable && job.attempt < job.maxAttempts ? 'RETRY_WAIT' : retryable ? 'DEAD_LETTER' : 'FAILED';
      const error = { code: rawError?.code || 'DELIVERY_FAILED', message: String(rawError?.message || rawError).slice(0, 1_000), retryable };
      await prisma.$transaction([
        prisma.deliveryJob.update({ where: { id: job.id }, data: { status: nextStatus, error, availableAt: new Date(Date.now() + Math.min(300_000, 5_000 * 2 ** Math.max(0, job.attempt - 1))), leaseOwner: null, leaseExpiresAt: null } }),
        prisma.deliveryAttempt.update({ where: { deliveryJobId_attempt: { deliveryJobId: job.id, attempt: job.attempt } }, data: { status: 'FAILED', errorCode: error.code, retryable, completedAt: new Date() } }),
        ...(nextStatus === 'FAILED' || nextStatus === 'DEAD_LETTER' ? [prisma.campaignRecipient.update({ where: { campaignId_contactId: { campaignId: job.campaignId, contactId: job.contactId } }, data: { status: 'FAILED' } })] : []),
      ]);
      if (nextStatus === 'RETRY_WAIT') totals.retried += 1; else totals.failed += 1;
    }
    await refreshCampaignState(prisma, job.campaignId);
  }
  return totals;
}
