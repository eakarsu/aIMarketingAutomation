/**
 * Webhook registration & management routes.
 *
 * POST   /api/webhooks           — register a new webhook endpoint
 * GET    /api/webhooks           — list registered webhooks for current user
 * DELETE /api/webhooks/:id       — remove a webhook registration
 * POST   /api/webhooks/test/:id  — send a test event to a registered URL
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  dispatchCampaignPerformance,
} from '../services/webhookService';

const router = Router();
router.use(authMiddleware);

// Register a new webhook
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }
    // Basic URL validation
    try { new URL(url); } catch {
      return res.status(400).json({ error: 'url must be a valid URL' });
    }

    const reg = registerWebhook(req.userId!, url, Array.isArray(events) ? events : [], secret);
    res.status(201).json({
      id: reg.id,
      url: reg.url,
      events: reg.events,
      secret: reg.secret,   // shown once at creation; subscriber should store this
      active: reg.active,
      createdAt: reg.createdAt,
    });
  } catch (error) {
    console.error('Register webhook error:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

// List webhooks (secrets redacted)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const regs = listWebhooks(req.userId!).map(r => ({
      id: r.id,
      url: r.url,
      events: r.events,
      active: r.active,
      createdAt: r.createdAt,
      // secret redacted after initial registration
    }));
    res.json(regs);
  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// Delete a webhook
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = deleteWebhook(req.userId!, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Send a test event to a specific registered URL
router.post('/test/:id', async (req: AuthRequest, res: Response) => {
  try {
    const regs = listWebhooks(req.userId!);
    const reg = regs.find(r => r.id === req.params.id);
    if (!reg) return res.status(404).json({ error: 'Webhook not found' });

    await dispatchCampaignPerformance(req.userId!, {
      campaignId: 'test-campaign-id',
      campaignName: 'Test Campaign',
      metrics: {
        totalSent: 1000,
        delivered: 980,
        opened: 245,
        clicked: 62,
        bounced: 20,
        unsubscribed: 5,
        openRate: '25.00',
        clickRate: '25.31',
      },
    });

    res.json({ message: 'Test event dispatched', url: reg.url });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to dispatch test webhook' });
  }
});

// Internal: fire webhook when campaign analytics are updated
// Called from campaign analytics update handlers — imported from this module.
export { dispatchCampaignPerformance };

export default router;
