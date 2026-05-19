/**
 * Inbound webhook normalizer.
 *
 * Public (no auth) endpoints that providers POST to:
 *   POST /api/inbound-webhooks/sendgrid    — SendGrid event webhook (delivered/open/click/bounce/dropped/spamreport/unsubscribe)
 *   POST /api/inbound-webhooks/twilio      — Twilio Status Callback (sent/delivered/failed/undelivered)
 *
 * Each event:
 *   - Normalizes provider payload into a CampaignAnalytics counter increment.
 *   - Updates CampaignRecipient.status and timestamps.
 *
 * Recipient lookup strategy:
 *   - SendGrid: pass `campaign_id` and `recipient_id` as `custom_args` when sending.
 *   - Twilio:   include `?recipientId=xxx` in StatusCallback URL.
 *   - Falls back to email/phone lookup if explicit IDs absent.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, RecipientStatus } from '@prisma/client';

const router = Router();

router.post('/sendgrid', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let processed = 0;
    for (const ev of events) {
      try {
        const recipientId = ev.recipient_id || ev.recipientId;
        const campaignId = ev.campaign_id || ev.campaignId;
        let recipient: any = null;
        if (recipientId) {
          recipient = await prisma.campaignRecipient.findUnique({ where: { id: recipientId } });
        }
        if (!recipient && campaignId && ev.email) {
          const contact = await prisma.contact.findFirst({ where: { email: ev.email } });
          if (contact) recipient = await prisma.campaignRecipient.findFirst({ where: { campaignId, contactId: contact.id } });
        }
        if (!recipient) continue;

        const update: any = {};
        const analyticsField: any = {};
        switch (ev.event) {
          case 'delivered': update.status = 'DELIVERED'; analyticsField.delivered = { increment: 1 }; break;
          case 'open':      update.status = 'OPENED'; update.openedAt = new Date(ev.timestamp ? ev.timestamp * 1000 : Date.now()); analyticsField.opened = { increment: 1 }; break;
          case 'click':     update.status = 'CLICKED'; update.clickedAt = new Date(ev.timestamp ? ev.timestamp * 1000 : Date.now()); analyticsField.clicked = { increment: 1 }; break;
          case 'bounce':
          case 'dropped':   update.status = 'BOUNCED'; update.bouncedAt = new Date(); analyticsField.bounced = { increment: 1 }; break;
          case 'unsubscribe': update.status = 'UNSUBSCRIBED'; update.unsubscribedAt = new Date(); analyticsField.unsubscribed = { increment: 1 }; break;
          case 'spamreport': update.status = 'UNSUBSCRIBED'; analyticsField.unsubscribed = { increment: 1 }; break;
        }
        if (Object.keys(update).length) {
          await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: update });
        }
        if (Object.keys(analyticsField).length) {
          // Find latest analytics record for the campaign or create one
          const existing = await prisma.campaignAnalytics.findFirst({ where: { campaignId: recipient.campaignId }, orderBy: { recordedAt: 'desc' } });
          if (existing) {
            await prisma.campaignAnalytics.update({ where: { id: existing.id }, data: analyticsField });
          } else {
            await prisma.campaignAnalytics.create({
              data: {
                campaignId: recipient.campaignId,
                delivered: analyticsField.delivered ? 1 : 0,
                opened: analyticsField.opened ? 1 : 0,
                clicked: analyticsField.clicked ? 1 : 0,
                bounced: analyticsField.bounced ? 1 : 0,
                unsubscribed: analyticsField.unsubscribed ? 1 : 0,
              },
            });
          }
        }
        processed++;
      } catch (err) {
        console.error('[sendgrid webhook] event error:', err);
      }
    }
    res.json({ processed });
  } catch (err) {
    console.error('[sendgrid webhook] handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/twilio', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const status: string = String(req.body.MessageStatus || '').toLowerCase();
    const to: string = req.body.To;
    const recipientId = req.query.recipientId || req.body.recipientId;

    let recipient: any = null;
    if (recipientId) {
      recipient = await prisma.campaignRecipient.findUnique({ where: { id: String(recipientId) } });
    }
    if (!recipient && to) {
      const contact = await prisma.contact.findFirst({ where: { phone: to } });
      if (contact) recipient = await prisma.campaignRecipient.findFirst({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' } });
    }
    if (!recipient) return res.json({ processed: 0 });

    const update: any = {};
    const inc: any = {};
    if (status === 'delivered')        { update.status = 'DELIVERED'; inc.delivered = { increment: 1 }; }
    else if (status === 'failed' || status === 'undelivered') { update.status = 'FAILED'; }
    else if (status === 'sent')        { update.status = 'SENT'; update.sentAt = new Date(); }

    if (Object.keys(update).length) await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: update });
    if (Object.keys(inc).length) {
      const existing = await prisma.campaignAnalytics.findFirst({ where: { campaignId: recipient.campaignId }, orderBy: { recordedAt: 'desc' } });
      if (existing) await prisma.campaignAnalytics.update({ where: { id: existing.id }, data: inc });
    }
    res.json({ processed: 1 });
  } catch (err) {
    console.error('[twilio webhook] error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
