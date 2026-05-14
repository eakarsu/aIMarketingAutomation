import { Router, Response } from 'express';
import { PrismaClient, CampaignType, CampaignStatus } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendCampaignNow } from '../services/sendExecutor';

const router = Router();
router.use(authMiddleware);

// Get all campaigns
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, status, search, sortBy, sortOrder, page = '1', pageSize = '20' } = req.query;

    const where: any = { userId: req.userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['name', 'type', 'status', 'createdAt', 'updatedAt'];
    const orderField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          segment: { select: { id: true, name: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { [orderField]: orderDir },
        skip,
        take: pageSizeNum,
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      data: campaigns,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
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

// Send campaign — now uses real send executor (or simulation if SMTP/Twilio unset)
router.post('/:id/send', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await sendCampaignNow(prisma, req.params.id, req.userId!);
    res.json({ message: 'Campaign dispatched', ...result });
  } catch (error: any) {
    console.error('Send campaign error:', error);
    if (error?.message === 'Campaign not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to send campaign' });
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

// Bulk update campaigns
router.put('/bulk-update', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No campaign IDs provided' });
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status as CampaignStatus;

    const result = await prisma.campaign.updateMany({
      where: { id: { in: ids }, userId: req.userId },
      data: updateData,
    });

    res.json({ message: `${result.count} campaigns updated` });
  } catch (error) {
    console.error('Bulk update campaigns error:', error);
    res.status(500).json({ error: 'Failed to bulk update campaigns' });
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
