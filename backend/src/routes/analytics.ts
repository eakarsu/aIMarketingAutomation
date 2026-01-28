import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get campaign analytics
router.get('/campaigns/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        analytics: { orderBy: { recordedAt: 'desc' } },
        recipients: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Calculate real-time stats from recipients
    const stats = {
      totalSent: campaign.recipients.filter(r => r.status !== 'PENDING').length,
      delivered: campaign.recipients.filter(r => ['DELIVERED', 'OPENED', 'CLICKED'].includes(r.status)).length,
      opened: campaign.recipients.filter(r => ['OPENED', 'CLICKED'].includes(r.status) || r.openedAt).length,
      clicked: campaign.recipients.filter(r => r.status === 'CLICKED' || r.clickedAt).length,
      bounced: campaign.recipients.filter(r => r.status === 'BOUNCED').length,
      unsubscribed: campaign.recipients.filter(r => r.status === 'UNSUBSCRIBED').length,
    };

    const rates = {
      openRate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(2) : 0,
      clickRate: stats.opened > 0 ? (stats.clicked / stats.opened * 100).toFixed(2) : 0,
      bounceRate: stats.totalSent > 0 ? (stats.bounced / stats.totalSent * 100).toFixed(2) : 0,
      unsubscribeRate: stats.delivered > 0 ? (stats.unsubscribed / stats.delivered * 100).toFixed(2) : 0,
    };

    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        sentAt: campaign.sentAt,
      },
      stats,
      rates,
      history: campaign.analytics,
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get overall analytics dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    // Get campaign stats
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: req.userId,
        sentAt: { gte: startDate },
      },
      include: {
        recipients: true,
        analytics: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    // Aggregate stats
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;

    campaigns.forEach(c => {
      c.recipients.forEach(r => {
        if (r.status !== 'PENDING') totalSent++;
        if (r.openedAt || ['OPENED', 'CLICKED'].includes(r.status)) totalOpened++;
        if (r.clickedAt || r.status === 'CLICKED') totalClicked++;
        if (r.status === 'BOUNCED') totalBounced++;
      });
    });

    // Get contact growth
    const contactsStart = await prisma.contact.count({
      where: { userId: req.userId, createdAt: { lt: startDate } },
    });
    const contactsNow = await prisma.contact.count({
      where: { userId: req.userId },
    });

    // Get automation stats
    const activeAutomations = await prisma.automation.count({
      where: { userId: req.userId, status: 'ACTIVE' },
    });
    const automationEnrollments = await prisma.automationEnrollment.count({
      where: {
        automation: { userId: req.userId },
        enrolledAt: { gte: startDate },
      },
    });

    // Get review stats
    const reviews = await prisma.review.findMany({
      where: { userId: req.userId, createdAt: { gte: startDate } },
    });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      period: parseInt(period as string),
      campaigns: {
        total: campaigns.length,
        sent: campaigns.filter(c => c.status === 'SENT').length,
      },
      email: {
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        openRate: totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(2) : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened * 100).toFixed(2) : 0,
      },
      contacts: {
        total: contactsNow,
        growth: contactsNow - contactsStart,
        growthRate: contactsStart > 0 ? ((contactsNow - contactsStart) / contactsStart * 100).toFixed(2) : 0,
      },
      automations: {
        active: activeAutomations,
        enrollments: automationEnrollments,
      },
      reviews: {
        total: reviews.length,
        avgRating: avgRating.toFixed(1),
      },
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get A/B test results
router.get('/ab-tests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const abTest = await prisma.aBTest.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        variants: true,
        campaign: { select: { id: true, name: true } },
      },
    });

    if (!abTest) {
      return res.status(404).json({ error: 'A/B Test not found' });
    }

    // Calculate winner
    let winner = null;
    let bestRate = 0;
    for (const variant of abTest.variants) {
      const rate = variant.sent > 0 ? variant.opened / variant.sent : 0;
      if (rate > bestRate) {
        bestRate = rate;
        winner = variant;
      }
    }

    res.json({
      ...abTest,
      suggestedWinner: winner?.name,
      confidence: bestRate > 0 ? Math.min(95, 50 + (abTest.variants[0]?.sent || 0) / 100 * 45).toFixed(0) : 0,
    });
  } catch (error) {
    console.error('Get A/B test results error:', error);
    res.status(500).json({ error: 'Failed to get A/B test results' });
  }
});

// Create A/B test
router.post('/ab-tests', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { campaignId, name, variants } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: req.userId },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const abTest = await prisma.aBTest.create({
      data: {
        userId: req.userId!,
        campaignId,
        name,
        variants: {
          create: variants.map((v: any) => ({
            name: v.name,
            subject: v.subject,
            content: v.content,
            percentage: v.percentage || 50,
          })),
        },
      },
      include: { variants: true },
    });

    res.status(201).json(abTest);
  } catch (error) {
    console.error('Create A/B test error:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
});

// End A/B test and select winner
router.post('/ab-tests/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { winnerVariant } = req.body;

    const result = await prisma.aBTest.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        status: 'COMPLETED',
        winnerVariant,
        endedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'A/B Test not found' });
    }

    res.json({ message: 'A/B Test completed' });
  } catch (error) {
    console.error('End A/B test error:', error);
    res.status(500).json({ error: 'Failed to end A/B test' });
  }
});

// Track conversion
router.post('/conversions', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { campaignId, contactId, value } = req.body;

    // Update campaign analytics
    const analytics = await prisma.campaignAnalytics.findFirst({
      where: { campaignId },
      orderBy: { recordedAt: 'desc' },
    });

    if (analytics) {
      await prisma.campaignAnalytics.update({
        where: { id: analytics.id },
        data: {
          conversions: { increment: 1 },
          revenue: { increment: value || 0 },
        },
      });
    }

    res.json({ message: 'Conversion tracked' });
  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Get ROI report
router.get('/roi', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaign: { userId: req.userId },
        recordedAt: { gte: start, lte: end },
      },
      include: {
        campaign: { select: { id: true, name: true, type: true } },
      },
    });

    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
    const totalSent = analytics.reduce((sum, a) => sum + a.totalSent, 0);

    // Group by campaign
    const byCampaign = analytics.reduce((acc: any, a) => {
      if (!acc[a.campaignId]) {
        acc[a.campaignId] = {
          campaign: a.campaign,
          revenue: 0,
          conversions: 0,
          sent: 0,
        };
      }
      acc[a.campaignId].revenue += a.revenue;
      acc[a.campaignId].conversions += a.conversions;
      acc[a.campaignId].sent += a.totalSent;
      return acc;
    }, {});

    res.json({
      period: { start, end },
      totals: {
        revenue: totalRevenue,
        conversions: totalConversions,
        sent: totalSent,
        conversionRate: totalSent > 0 ? (totalConversions / totalSent * 100).toFixed(2) : 0,
        revenuePerEmail: totalSent > 0 ? (totalRevenue / totalSent).toFixed(2) : 0,
      },
      byCampaign: Object.values(byCampaign),
    });
  } catch (error) {
    console.error('Get ROI report error:', error);
    res.status(500).json({ error: 'Failed to get ROI report' });
  }
});

export default router;
