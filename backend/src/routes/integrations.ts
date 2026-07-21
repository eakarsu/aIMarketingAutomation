import { Router, Response } from 'express';
import { PrismaClient, IntegrationType, IntegrationStatus } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { encryptConnectorConfig } from '../security/connectorCrypto';

const router = Router();
router.use(authMiddleware);

// Get all integrations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, status } = req.query;

    const where: any = { userId: req.userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const integrations = await prisma.integration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Mask sensitive config data
    const masked = integrations.map(i => ({
      ...i,
      config: '***',
      hasConfig: !!i.config,
    }));

    res.json(masked);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get single integration
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const integration = await prisma.integration.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Mask sensitive data
    res.json({
      ...integration,
      config: '***',
      hasConfig: !!integration.config,
    });
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ error: 'Failed to get integration' });
  }
});

// Create integration (ADMIN only)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, name, config } = req.body;

    const integration = await prisma.integration.create({
      data: {
        userId: req.userId!,
        type: type as IntegrationType,
        name,
        config: encryptConnectorConfig(config),
      },
    });

    res.status(201).json({
      ...integration,
      config: '***',
    });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration (ADMIN only)
router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, config, status } = req.body;

    const existing = await prisma.integration.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const updateData: any = { name };
    if (config) updateData.config = encryptConnectorConfig(config);
    if (status) updateData.status = status as IntegrationStatus;

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      ...integration,
      config: '***',
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Delete integration (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.integration.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration deleted' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// Legacy provider integrations remain delivery credentials only. Customer-data
// connectivity uses /api/source-connections so verification has a real contract.
router.post('/:id/test', async (req: AuthRequest, res: Response) => {
  res.status(410).json({ error: 'Legacy integration simulation retired', use: '/api/source-connections/:id/verify' });
});

// Sync integration
router.post('/:id/sync', async (req: AuthRequest, res: Response) => {
  res.status(410).json({ error: 'Legacy timestamp-only sync retired', use: '/api/source-connections/:id/sync-runs' });
});

// Activate integration
router.post('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.integration.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status: 'ACTIVE' },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration activated' });
  } catch (error) {
    console.error('Activate integration error:', error);
    res.status(500).json({ error: 'Failed to activate integration' });
  }
});

// Deactivate integration
router.post('/:id/deactivate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.integration.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status: 'INACTIVE' },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ message: 'Integration deactivated' });
  } catch (error) {
    console.error('Deactivate integration error:', error);
    res.status(500).json({ error: 'Failed to deactivate integration' });
  }
});

// Get available integration types
router.get('/options/types', async (req: AuthRequest, res: Response) => {
  res.json([
    { category: 'Email Providers', options: [
      { value: 'EMAIL_SENDGRID', label: 'SendGrid' },
      { value: 'EMAIL_MAILGUN', label: 'Mailgun' },
      { value: 'EMAIL_SES', label: 'Amazon SES' },
    ]},
    { category: 'SMS Providers', options: [
      { value: 'SMS_TWILIO', label: 'Twilio' },
      { value: 'SMS_MESSAGEBIRD', label: 'MessageBird' },
    ]},
    { category: 'Social Media', options: [
      { value: 'SOCIAL_FACEBOOK', label: 'Facebook' },
      { value: 'SOCIAL_INSTAGRAM', label: 'Instagram' },
      { value: 'SOCIAL_TWITTER', label: 'Twitter/X' },
      { value: 'SOCIAL_LINKEDIN', label: 'LinkedIn' },
    ]},
    { category: 'Advertising', options: [
      { value: 'ADS_GOOGLE', label: 'Google Ads' },
      { value: 'ADS_FACEBOOK', label: 'Facebook Ads' },
    ]},
    { category: 'Reviews', options: [
      { value: 'REVIEW_GOOGLE', label: 'Google Business' },
      { value: 'REVIEW_YELP', label: 'Yelp' },
    ]},
    { category: 'CRM', options: [
      { value: 'CRM_SALESFORCE', label: 'Salesforce' },
      { value: 'CRM_HUBSPOT', label: 'HubSpot' },
    ]},
    { category: 'Booking', options: [
      { value: 'BOOKING_CALENDLY', label: 'Calendly' },
      { value: 'BOOKING_ACUITY', label: 'Acuity Scheduling' },
    ]},
  ]);
});

export default router;
