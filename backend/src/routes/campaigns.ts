import { Router, Response } from 'express';
import { PrismaClient, CampaignType, CampaignStatus } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all campaigns
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, status, search } = req.query;

    const where: any = { userId: req.userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get single campaign
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        template: true,
        segment: { include: { contacts: { include: { contact: true } } } },
        recipients: { include: { contact: true } },
        analytics: { orderBy: { recordedAt: 'desc' }, take: 1 },
        abTests: { include: { variants: true } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// Create campaign
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, subject, content, htmlContent, templateId, segmentId, scheduledAt } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        userId: req.userId!,
        name,
        description,
        type: type as CampaignType,
        subject,
        content,
        htmlContent,
        templateId,
        segmentId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, status, subject, content, htmlContent, templateId, segmentId, scheduledAt } = req.body;

    const campaign = await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        name,
        description,
        type: type as CampaignType,
        status: status as CampaignStatus,
        subject,
        content,
        htmlContent,
        templateId,
        segmentId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    if (campaign.count === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updated = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.campaign.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Send campaign
router.post('/:id/send', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        segment: { include: { contacts: { include: { contact: true } } } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get contacts from segment or all contacts
    let contacts;
    if (campaign.segment) {
      contacts = campaign.segment.contacts.map(cs => cs.contact);
    } else {
      contacts = await prisma.contact.findMany({
        where: { userId: req.userId, status: 'ACTIVE' },
      });
    }

    // Create recipients
    const recipients = await Promise.all(
      contacts.map(contact =>
        prisma.campaignRecipient.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            status: 'SENT',
            sentAt: new Date(),
          },
        })
      )
    );

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Create initial analytics
    await prisma.campaignAnalytics.create({
      data: {
        campaignId: campaign.id,
        totalSent: recipients.length,
        delivered: recipients.length,
      },
    });

    res.json({ message: 'Campaign sent', recipientCount: recipients.length });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Schedule campaign
router.post('/:id/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { scheduledAt } = req.body;

    const result = await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: new Date(scheduledAt),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign scheduled' });
  } catch (error) {
    console.error('Schedule campaign error:', error);
    res.status(500).json({ error: 'Failed to schedule campaign' });
  }
});

// Duplicate campaign
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const original = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!original) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const duplicate = await prisma.campaign.create({
      data: {
        userId: req.userId!,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        status: 'DRAFT',
        subject: original.subject,
        content: original.content,
        htmlContent: original.htmlContent,
        templateId: original.templateId,
        segmentId: original.segmentId,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Duplicate campaign error:', error);
    res.status(500).json({ error: 'Failed to duplicate campaign' });
  }
});

// Get campaign types for dropdown
router.get('/options/types', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'EMAIL', label: 'Email Campaign' },
    { value: 'SMS', label: 'SMS Campaign' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media Campaign' },
    { value: 'MULTI_CHANNEL', label: 'Multi-Channel Campaign' },
  ]);
});

// Get campaign statuses for dropdown
router.get('/options/statuses', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'SENDING', label: 'Sending' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]);
});

export default router;
