import { Router, Response } from 'express';
import { PrismaClient, TemplateType } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all templates
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, category, search, sortBy, sortOrder } = req.query;

    const where: any = {
      OR: [
        { userId: req.userId },
        { isPublic: true },
      ],
    };
    if (type) where.type = type;
    if (category) where.category = category;
    if (search) {
      where.AND = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const allowedSort = ['name', 'type', 'category', 'createdAt'];
    const oField = allowedSort.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const oDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const { page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          _count: { select: { campaigns: true } },
        },
        orderBy: { [oField]: oDir },
        skip,
        take: pageSizeNum,
      }),
      prisma.template.count({ where }),
    ]);

    res.json({
      data: templates,
      pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get single template
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { userId: req.userId },
          { isPublic: true },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create template
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, subject, content, htmlContent, category, isPublic } = req.body;

    const template = await prisma.template.create({
      data: {
        userId: req.userId!,
        name,
        description,
        type: type as TemplateType,
        subject,
        content,
        htmlContent,
        category,
        isPublic: isPublic || false,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, subject, content, htmlContent, category, isPublic } = req.body;

    const existing = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        type: type as TemplateType,
        subject,
        content,
        htmlContent,
        category,
        isPublic,
      },
    });

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.template.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Duplicate template
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const original = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { userId: req.userId },
          { isPublic: true },
        ],
      },
    });

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const duplicate = await prisma.template.create({
      data: {
        userId: req.userId!,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        subject: original.subject,
        content: original.content,
        htmlContent: original.htmlContent,
        category: original.category,
        isPublic: false,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// Get template types for dropdown
router.get('/options/types', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'EMAIL', label: 'Email Template' },
    { value: 'SMS', label: 'SMS Template' },
    { value: 'SOCIAL_POST', label: 'Social Post Template' },
    { value: 'LANDING_PAGE', label: 'Landing Page Template' },
  ]);
});

// Get template categories for dropdown
router.get('/options/categories', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const categories = await prisma.template.findMany({
      where: { userId: req.userId },
      select: { category: true },
      distinct: ['category'],
    });

    const uniqueCategories = categories
      .filter(c => c.category)
      .map(c => ({ value: c.category!, label: c.category! }));

    // Add default categories
    const defaults = [
      { value: 'Newsletter', label: 'Newsletter' },
      { value: 'Promotional', label: 'Promotional' },
      { value: 'Transactional', label: 'Transactional' },
      { value: 'Welcome', label: 'Welcome' },
      { value: 'Follow-up', label: 'Follow-up' },
    ];

    const allCategories = [...defaults, ...uniqueCategories];
    const seen = new Set();
    const unique = allCategories.filter(c => {
      if (seen.has(c.value)) return false;
      seen.add(c.value);
      return true;
    });

    res.json(unique);
  } catch (error) {
    console.error('Get template categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
