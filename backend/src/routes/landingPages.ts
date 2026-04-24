import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all landing pages
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { published, search, sortBy, sortOrder } = req.query;

    const where: any = { userId: req.userId };
    if (published !== undefined) where.isPublished = published === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const allowedSort = ['name', 'slug', 'views', 'conversions', 'createdAt'];
    const oField = allowedSort.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const oDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const landingPages = await prisma.landingPage.findMany({
      where,
      include: {
        _count: { select: { forms: true } },
      },
      orderBy: { [oField]: oDir },
    });

    res.json(landingPages);
  } catch (error) {
    console.error('Get landing pages error:', error);
    res.status(500).json({ error: 'Failed to get landing pages' });
  }
});

// Get single landing page
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const landingPage = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        forms: true,
      },
    });

    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json(landingPage);
  } catch (error) {
    console.error('Get landing page error:', error);
    res.status(500).json({ error: 'Failed to get landing page' });
  }
});

// Create landing page
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, slug, htmlContent, cssContent, jsContent } = req.body;

    // Ensure slug is unique
    const existing = await prisma.landingPage.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug already in use' });
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        userId: req.userId!,
        name,
        slug,
        htmlContent,
        cssContent,
        jsContent,
      },
    });

    res.status(201).json(landingPage);
  } catch (error) {
    console.error('Create landing page error:', error);
    res.status(500).json({ error: 'Failed to create landing page' });
  }
});

// Update landing page
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, slug, htmlContent, cssContent, jsContent, isPublished } = req.body;

    const existing = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.landingPage.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ error: 'Slug already in use' });
      }
    }

    const landingPage = await prisma.landingPage.update({
      where: { id: req.params.id },
      data: {
        name,
        slug,
        htmlContent,
        cssContent,
        jsContent,
        isPublished,
      },
    });

    res.json(landingPage);
  } catch (error) {
    console.error('Update landing page error:', error);
    res.status(500).json({ error: 'Failed to update landing page' });
  }
});

// Delete landing page
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.landingPage.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json({ message: 'Landing page deleted' });
  } catch (error) {
    console.error('Delete landing page error:', error);
    res.status(500).json({ error: 'Failed to delete landing page' });
  }
});

// Publish landing page
router.post('/:id/publish', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.landingPage.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isPublished: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json({ message: 'Landing page published' });
  } catch (error) {
    console.error('Publish landing page error:', error);
    res.status(500).json({ error: 'Failed to publish landing page' });
  }
});

// Unpublish landing page
router.post('/:id/unpublish', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.landingPage.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isPublished: false },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json({ message: 'Landing page unpublished' });
  } catch (error) {
    console.error('Unpublish landing page error:', error);
    res.status(500).json({ error: 'Failed to unpublish landing page' });
  }
});

// Duplicate landing page
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const original = await prisma.landingPage.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!original) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const newSlug = `${original.slug}-copy-${Date.now()}`;
    const duplicate = await prisma.landingPage.create({
      data: {
        userId: req.userId!,
        name: `${original.name} (Copy)`,
        slug: newSlug,
        htmlContent: original.htmlContent,
        cssContent: original.cssContent,
        jsContent: original.jsContent,
        isPublished: false,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Duplicate landing page error:', error);
    res.status(500).json({ error: 'Failed to duplicate landing page' });
  }
});

// Track page view (public endpoint)
router.post('/track/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    await prisma.landingPage.update({
      where: { slug: req.params.slug },
      data: { views: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

export default router;
