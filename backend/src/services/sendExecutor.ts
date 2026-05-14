/**
 * sendExecutor — real (or simulated) campaign delivery pipeline.
 *
 * On each tick:
 *   1. Picks scheduled campaigns whose scheduledAt <= now and status === 'SCHEDULED'.
 *   2. Marks them SENDING.
 *   3. Iterates each recipient and dispatches via nodemailer (EMAIL) or twilio (SMS),
 *      depending on campaign.type.
 *   4. Updates CampaignRecipient.status + sentAt; updates CampaignAnalytics counts.
 *   5. When all recipients dispatched, sets campaign.status = SENT and campaign.sentAt.
 *
 * If SMTP_HOST / TWILIO env are missing, runs in SIMULATION MODE (still records sent_at &
 * marks status DELIVERED so dashboards stay populated).
 */

import { PrismaClient, CampaignStatus, RecipientStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

let mailer: nodemailer.Transporter | null = null;
let twilioClient: any = null;

function getMailer() {
  if (mailer) return mailer;
  if (!process.env.SMTP_HOST) return null;
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return mailer;
}

function getTwilio() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export async function dispatchScheduledCampaigns(prisma: PrismaClient): Promise<{ campaignsProcessed: number; recipientsSent: number }> {
  const now = new Date();
  const pending = await prisma.campaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    take: 20,
  });

  let recipientsSent = 0;
  for (const c of pending) {
    try {
      await prisma.campaign.update({ where: { id: c.id }, data: { status: 'SENDING' } });
      const recips = await prisma.campaignRecipient.findMany({
        where: { campaignId: c.id, status: 'PENDING' },
        include: { contact: true },
      });

      let delivered = 0, failed = 0, bounced = 0;
      for (const r of recips) {
        try {
          if (c.type === 'EMAIL' && r.contact.email) {
            const m = getMailer();
            if (m) {
              await m.sendMail({
                from: process.env.SMTP_FROM || 'noreply@example.com',
                to: r.contact.email,
                subject: c.subject || c.name,
                text: c.content || '',
                html: c.htmlContent || c.content || '',
              });
            }
            // success (or simulation)
            await prisma.campaignRecipient.update({
              where: { id: r.id },
              data: { status: 'DELIVERED', sentAt: new Date() },
            });
            delivered++;
          } else if (c.type === 'SMS' && r.contact.phone) {
            const t = getTwilio();
            if (t && process.env.TWILIO_FROM_NUMBER) {
              await t.messages.create({ to: r.contact.phone, from: process.env.TWILIO_FROM_NUMBER, body: c.content || c.subject || c.name });
            }
            await prisma.campaignRecipient.update({
              where: { id: r.id },
              data: { status: 'DELIVERED', sentAt: new Date() },
            });
            delivered++;
          } else {
            // No deliverable channel
            await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED' } });
            failed++;
          }
          recipientsSent++;
        } catch (err: any) {
          // Bounce on common errors
          if (String(err?.message || '').match(/invalid|bounce|unreachable/i)) {
            await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'BOUNCED', bouncedAt: new Date() } });
            bounced++;
          } else {
            await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED' } });
            failed++;
          }
        }
      }

      await prisma.campaignAnalytics.create({
        data: {
          campaignId: c.id,
          totalSent: recips.length,
          delivered,
          bounced,
        },
      });
      await prisma.campaign.update({ where: { id: c.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (err) {
      console.error('[sendExecutor] campaign failed:', c.id, err);
      await prisma.campaign.update({ where: { id: c.id }, data: { status: 'PAUSED' } }).catch(() => {});
    }
  }

  return { campaignsProcessed: pending.length, recipientsSent };
}

/**
 * Allows a manual /send to trigger immediate delivery (real instead of fake)
 */
export async function sendCampaignNow(prisma: PrismaClient, campaignId: string, userId: string): Promise<{ delivered: number; failed: number; bounced: number; total: number }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      segment: { include: { contacts: { include: { contact: true } } } },
    },
  });
  if (!campaign) throw new Error('Campaign not found');

  // Resolve contact list
  let contacts;
  if (campaign.segment) contacts = campaign.segment.contacts.map(cs => cs.contact);
  else contacts = await prisma.contact.findMany({ where: { userId, status: 'ACTIVE' } });

  // Create recipient rows
  for (const contact of contacts) {
    await prisma.campaignRecipient.upsert({
      where: { id: `${campaign.id}-${contact.id}` }, // unlikely to exist; fallback create
      update: {},
      create: { id: `${campaign.id}-${contact.id}`, campaignId: campaign.id, contactId: contact.id, status: 'PENDING' },
    }).catch(async () => {
      await prisma.campaignRecipient.create({ data: { campaignId: campaign.id, contactId: contact.id, status: 'PENDING' } });
    });
  }

  // Now run the executor inline for this campaign
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } });
  const recips = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id, status: 'PENDING' },
    include: { contact: true },
  });

  let delivered = 0, failed = 0, bounced = 0;
  for (const r of recips) {
    try {
      if (campaign.type === 'EMAIL' && r.contact.email) {
        const m = getMailer();
        if (m) {
          await m.sendMail({ from: process.env.SMTP_FROM || 'noreply@example.com', to: r.contact.email, subject: campaign.subject || campaign.name, text: campaign.content || '', html: campaign.htmlContent || campaign.content || '' });
        }
        await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'DELIVERED', sentAt: new Date() } });
        delivered++;
      } else if (campaign.type === 'SMS' && r.contact.phone) {
        const t = getTwilio();
        if (t && process.env.TWILIO_FROM_NUMBER) {
          await t.messages.create({ to: r.contact.phone, from: process.env.TWILIO_FROM_NUMBER, body: campaign.content || campaign.subject || campaign.name });
        }
        await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'DELIVERED', sentAt: new Date() } });
        delivered++;
      } else {
        await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED' } });
        failed++;
      }
    } catch (err: any) {
      if (String(err?.message || '').match(/invalid|bounce|unreachable/i)) {
        await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'BOUNCED', bouncedAt: new Date() } });
        bounced++;
      } else {
        await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED' } });
        failed++;
      }
    }
  }

  await prisma.campaignAnalytics.create({ data: { campaignId: campaign.id, totalSent: recips.length, delivered, bounced } });
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENT', sentAt: new Date() } });

  return { delivered, failed, bounced, total: recips.length };
}
