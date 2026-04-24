import { Router, Response } from 'express';
import { PrismaClient, ReviewPlatform, ReviewStatus } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all reviews
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { platform, status, rating, search, sortBy, sortOrder } = req.query;

    const where: any = { userId: req.userId };
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (rating) where.rating = parseInt(rating as string);
    if (search) {
      where.OR = [
        { content: { contains: search as string, mode: 'insensitive' } },
        { authorName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const allowedSort = ['authorName', 'platform', 'rating', 'status', 'createdAt'];
    const oField = allowedSort.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const oDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const reviews = await prisma.review.findMany({
      where,
      include: {
        contact: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { [oField]: oDir },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Get review stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const reviews = await prisma.review.findMany({
      where: { userId: req.userId },
    });

    const stats = {
      total: reviews.length,
      avgRating: reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      byRating: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      },
      byPlatform: {} as Record<string, number>,
      byStatus: {
        pending: reviews.filter(r => r.status === 'PENDING').length,
        responded: reviews.filter(r => r.status === 'RESPONDED').length,
        ignored: reviews.filter(r => r.status === 'IGNORED').length,
      },
    };

    // Count by platform
    reviews.forEach(r => {
      stats.byPlatform[r.platform] = (stats.byPlatform[r.platform] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: 'Failed to get review stats' });
  }
});

// Get single review
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const review = await prisma.review.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        contact: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to get review' });
  }
});

// Create review (manual entry)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { platform, rating, content, authorName, authorEmail, contactId, publishedAt } = req.body;

    const review = await prisma.review.create({
      data: {
        userId: req.userId!,
        platform: platform as ReviewPlatform,
        rating,
        content,
        authorName,
        authorEmail,
        contactId,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { platform, rating, content, authorName, authorEmail, status, response } = req.body;

    const existing = await prisma.review.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const updateData: any = {
      platform: platform as ReviewPlatform,
      rating,
      content,
      authorName,
      authorEmail,
      status: status as ReviewStatus,
    };

    if (response !== undefined) {
      updateData.response = response;
      if (response && !existing.respondedAt) {
        updateData.respondedAt = new Date();
        updateData.status = 'RESPONDED';
      }
    }

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(review);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.review.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Respond to review
router.post('/:id/respond', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { response } = req.body;

    const result = await prisma.review.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        response,
        status: 'RESPONDED',
        respondedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Response added' });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({ error: 'Failed to respond to review' });
  }
});

// Send review request
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { contactIds, platform, message } = req.body;

    // In production, this would send actual emails/SMS
    // For now, just log the request
    console.log(`Sending review request to ${contactIds.length} contacts for ${platform}`);

    res.json({ message: `Review request sent to ${contactIds.length} contacts` });
  } catch (error) {
    console.error('Send review request error:', error);
    res.status(500).json({ error: 'Failed to send review request' });
  }
});

// Ignore review
router.post('/:id/ignore', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.review.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status: 'IGNORED' },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review ignored' });
  } catch (error) {
    console.error('Ignore review error:', error);
    res.status(500).json({ error: 'Failed to ignore review' });
  }
});

// Get platforms for dropdown
router.get('/options/platforms', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'GOOGLE', label: 'Google' },
    { value: 'YELP', label: 'Yelp' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TRUSTPILOT', label: 'Trustpilot' },
    { value: 'CUSTOM', label: 'Custom/Other' },
  ]);
});

export default router;
