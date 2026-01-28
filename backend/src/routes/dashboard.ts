import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get dashboard overview
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    // Get counts
    const [
      totalContacts,
      activeContacts,
      totalCampaigns,
      activeCampaigns,
      totalAutomations,
      activeAutomations,
      totalTemplates,
      pendingReviews,
      avgRating,
    ] = await Promise.all([
      prisma.contact.count({ where: { userId: req.userId } }),
      prisma.contact.count({ where: { userId: req.userId, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: { userId: req.userId } }),
      prisma.campaign.count({ where: { userId: req.userId, status: { in: ['SCHEDULED', 'SENDING'] } } }),
      prisma.automation.count({ where: { userId: req.userId } }),
      prisma.automation.count({ where: { userId: req.userId, status: 'ACTIVE' } }),
      prisma.template.count({ where: { userId: req.userId } }),
      prisma.review.count({ where: { userId: req.userId, status: 'PENDING' } }),
      prisma.review.aggregate({ where: { userId: req.userId }, _avg: { rating: true } }),
    ]);

    // Get recent campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: { select: { recipients: true } },
      },
    });

    // Get recent contacts
    const recentContacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get recent reviews
    const recentReviews = await prisma.review.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculate growth (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newContacts = await prisma.contact.count({
      where: { userId: req.userId, createdAt: { gte: thirtyDaysAgo } },
    });

    // Get campaign performance summary
    const sentCampaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, status: 'SENT' },
      include: {
        recipients: true,
      },
      orderBy: { sentAt: 'desc' },
      take: 10,
    });

    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    sentCampaigns.forEach(c => {
      c.recipients.forEach(r => {
        totalSent++;
        if (r.openedAt) totalOpened++;
        if (r.clickedAt) totalClicked++;
      });
    });

    res.json({
      stats: {
        contacts: {
          total: totalContacts,
          active: activeContacts,
          newThisMonth: newContacts,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          sent: sentCampaigns.length,
        },
        automations: {
          total: totalAutomations,
          active: activeAutomations,
        },
        templates: {
          total: totalTemplates,
        },
        reviews: {
          pending: pendingReviews,
          avgRating: avgRating._avg.rating?.toFixed(1) || '0',
        },
        performance: {
          totalSent,
          openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0',
          clickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0',
        },
      },
      recent: {
        campaigns: recentCampaigns,
        contacts: recentContacts,
        reviews: recentReviews,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get quick stats for header
router.get('/quick-stats', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const [contacts, pendingReviews, activeAutomations] = await Promise.all([
      prisma.contact.count({ where: { userId: req.userId, status: 'ACTIVE' } }),
      prisma.review.count({ where: { userId: req.userId, status: 'PENDING' } }),
      prisma.automation.count({ where: { userId: req.userId, status: 'ACTIVE' } }),
    ]);

    res.json({
      contacts,
      pendingReviews,
      activeAutomations,
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ error: 'Failed to get quick stats' });
  }
});

// Get activity feed
router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { limit = '20' } = req.query;

    // Combine recent activities from different sources
    const [recentContacts, recentCampaigns, recentReviews, recentSubmissions] = await Promise.all([
      prisma.contact.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      }),
      prisma.campaign.findMany({
        where: { userId: req.userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
      prisma.review.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, authorName: true, rating: true, platform: true, createdAt: true },
      }),
      prisma.formSubmission.findMany({
        where: { form: { userId: req.userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { form: { select: { name: true } }, contact: { select: { email: true } } },
      }),
    ]);

    // Format as activity items
    const activities = [
      ...recentContacts.map(c => ({
        type: 'contact_added',
        message: `New contact: ${c.firstName || ''} ${c.lastName || ''} (${c.email})`,
        timestamp: c.createdAt,
        entityId: c.id,
      })),
      ...recentCampaigns.map(c => ({
        type: 'campaign_updated',
        message: `Campaign "${c.name}" status: ${c.status}`,
        timestamp: c.updatedAt,
        entityId: c.id,
      })),
      ...recentReviews.map(r => ({
        type: 'review_received',
        message: `${r.rating}-star review from ${r.authorName} on ${r.platform}`,
        timestamp: r.createdAt,
        entityId: r.id,
      })),
      ...recentSubmissions.map(s => ({
        type: 'form_submission',
        message: `Form submission on "${s.form.name}" from ${s.contact?.email || 'Anonymous'}`,
        timestamp: s.createdAt,
        entityId: s.id,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, parseInt(limit as string));

    res.json(activities);
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

export default router;
