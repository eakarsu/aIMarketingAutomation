import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all segments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const where = { userId: req.userId };
    const [segments, total] = await Promise.all([
      prisma.segment.findMany({
        where,
        include: {
          _count: { select: { contacts: true, campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
      }),
      prisma.segment.count({ where }),
    ]);

    res.json({
      data: segments,
      pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
    });
  } catch (error) {
    console.error('Get segments error:', error);
    res.status(500).json({ error: 'Failed to get segments' });
  }
});

// Get single segment
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const segment = await prisma.segment.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        contacts: { include: { contact: true } },
        campaigns: { select: { id: true, name: true, status: true } },
        automations: { select: { id: true, name: true, status: true } },
      },
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json(segment);
  } catch (error) {
    console.error('Get segment error:', error);
    res.status(500).json({ error: 'Failed to get segment' });
  }
});

// Create segment
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, rules, isAISuggested } = req.body;

    const segment = await prisma.segment.create({
      data: {
        userId: req.userId!,
        name,
        description,
        rules: JSON.stringify(rules || []),
        isAISuggested: isAISuggested || false,
      },
    });

    // Apply rules to find matching contacts
    if (rules && rules.length > 0) {
      const matchingContacts = await applySegmentRules(prisma, req.userId!, rules);
      if (matchingContacts.length > 0) {
        await prisma.contactSegment.createMany({
          data: matchingContacts.map(contactId => ({
            segmentId: segment.id,
            contactId,
          })),
        });
      }
    }

    const result = await prisma.segment.findUnique({
      where: { id: segment.id },
      include: { _count: { select: { contacts: true } } },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// Update segment
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, rules } = req.body;

    const existing = await prisma.segment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    await prisma.segment.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        rules: rules ? JSON.stringify(rules) : undefined,
      },
    });

    // Refresh segment contacts if rules changed
    if (rules) {
      await prisma.contactSegment.deleteMany({ where: { segmentId: req.params.id } });
      const matchingContacts = await applySegmentRules(prisma, req.userId!, rules);
      if (matchingContacts.length > 0) {
        await prisma.contactSegment.createMany({
          data: matchingContacts.map(contactId => ({
            segmentId: req.params.id,
            contactId,
          })),
        });
      }
    }

    const result = await prisma.segment.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { contacts: true } } },
    });

    res.json(result);
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// Delete segment
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.segment.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ message: 'Segment deleted' });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// Refresh segment (re-apply rules)
router.post('/:id/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const segment = await prisma.segment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const rules = JSON.parse(segment.rules);
    await prisma.contactSegment.deleteMany({ where: { segmentId: req.params.id } });

    const matchingContacts = await applySegmentRules(prisma, req.userId!, rules);
    if (matchingContacts.length > 0) {
      await prisma.contactSegment.createMany({
        data: matchingContacts.map(contactId => ({
          segmentId: req.params.id,
          contactId,
        })),
      });
    }

    res.json({ message: 'Segment refreshed', contactCount: matchingContacts.length });
  } catch (error) {
    console.error('Refresh segment error:', error);
    res.status(500).json({ error: 'Failed to refresh segment' });
  }
});

// Add contact to segment manually
router.post('/:id/contacts', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { contactIds } = req.body;

    const segment = await prisma.segment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    await prisma.contactSegment.createMany({
      data: contactIds.map((contactId: string) => ({
        segmentId: req.params.id,
        contactId,
      })),
      skipDuplicates: true,
    });

    res.json({ message: 'Contacts added to segment' });
  } catch (error) {
    console.error('Add contacts to segment error:', error);
    res.status(500).json({ error: 'Failed to add contacts to segment' });
  }
});

// Remove contact from segment
router.delete('/:id/contacts/:contactId', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    await prisma.contactSegment.deleteMany({
      where: {
        segmentId: req.params.id,
        contactId: req.params.contactId,
      },
    });

    res.json({ message: 'Contact removed from segment' });
  } catch (error) {
    console.error('Remove contact from segment error:', error);
    res.status(500).json({ error: 'Failed to remove contact from segment' });
  }
});

// Helper function to apply segment rules
async function applySegmentRules(prisma: PrismaClient, userId: string, rules: any[]): Promise<string[]> {
  const where: any = { userId };

  for (const rule of rules) {
    switch (rule.field) {
      case 'status':
        where.status = rule.value;
        break;
      case 'source':
        where.source = { contains: rule.value, mode: 'insensitive' };
        break;
      case 'email':
        if (rule.operator === 'contains') {
          where.email = { contains: rule.value, mode: 'insensitive' };
        }
        break;
      case 'company':
        if (rule.operator === 'contains') {
          where.company = { contains: rule.value, mode: 'insensitive' };
        }
        break;
      case 'hasTag':
        where.tags = { some: { tagId: rule.value } };
        break;
      case 'createdAfter':
        where.createdAt = { gte: new Date(rule.value) };
        break;
      case 'createdBefore':
        where.createdAt = { lte: new Date(rule.value) };
        break;
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true },
  });

  return contacts.map(c => c.id);
}

export default router;
