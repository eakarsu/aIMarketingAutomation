import { Router, Response } from 'express';
import { PrismaClient, AIGenerationType } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// OpenRouter API call helper
async function callOpenRouter(messages: { role: string; content: string }[], maxTokens = 1000): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('NO_API_KEY');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Marketing Automation',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenRouter API error:', error);
    throw new Error('API_ERROR');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Check if AI is available
function isAIAvailable(): boolean {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return !!(apiKey && !apiKey.includes('your-'));
}

// AI Content Writer - Generate marketing copy
router.post('/content', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { prompt, type, tone, length, topic, keywords } = req.body;

    let result: string;

    if (isAIAvailable()) {
      try {
        result = await callOpenRouter([
          {
            role: 'system',
            content: `You are a professional marketing copywriter. Write ${type || 'marketing'} content with a ${tone || 'professional'} tone. Keep it ${length || 'medium'} length.`,
          },
          { role: 'user', content: prompt || `Write ${type || 'marketing'} content about: ${topic}. Keywords: ${keywords?.join(', ') || 'none'}` },
        ]);
      } catch (error) {
        result = generateDemoContent(type, prompt || topic);
      }
    } else {
      result = generateDemoContent(type, prompt || topic);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'CONTENT',
        prompt: prompt || topic || '',
        result,
        metadata: JSON.stringify({ type, tone, length }),
      },
    });

    res.json({ content: result });
  } catch (error) {
    console.error('AI content generation error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// AI Subject Line Optimizer
router.post('/subject-lines', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { content, count = 5 } = req.body;

    let subjects: string[];

    if (isAIAvailable()) {
      try {
        const result = await callOpenRouter([
          {
            role: 'system',
            content: `You are an email marketing expert. Generate exactly ${count} compelling email subject lines for the given content. Focus on high open rates. Return ONLY the subject lines, one per line, without numbering or bullet points.`,
          },
          { role: 'user', content },
        ], 500);
        subjects = result.split('\n').filter(s => s.trim()).slice(0, count);
      } catch (error) {
        subjects = getDefaultSubjectLines(count);
      }
    } else {
      subjects = getDefaultSubjectLines(count);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'SUBJECT_LINE',
        prompt: content,
        result: JSON.stringify(subjects),
      },
    });

    res.json({ subjects, subjectLines: subjects });
  } catch (error) {
    console.error('AI subject line generation error:', error);
    res.status(500).json({ error: 'Failed to generate subject lines' });
  }
});

// AI Send Time Optimizer
router.post('/send-time', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { audienceType, campaignType, timezone, industry } = req.body;

    // Gather user's data context
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, status: 'SENT' },
      include: {
        recipients: { where: { openedAt: { not: null } } },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    const contacts = await prisma.contact.count({ where: { userId: req.userId } });

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are an email marketing optimization expert. Analyze the provided data and industry context to recommend optimal send times. Return ONLY valid JSON with this structure:
{
  "bestDay": "Tuesday",
  "bestTime": "10:00 AM",
  "alternativeDay": "Thursday",
  "alternativeTime": "2:00 PM",
  "confidence": 85,
  "reasoning": "Brief explanation of why these times are optimal",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"],
  "avoidTimes": ["Saturday morning", "Monday 8-9 AM"],
  "industryInsights": "Specific insight for this industry"
}`,
          },
          {
            role: 'user',
            content: `Analyze and recommend the best email send times for:
- Industry: ${industry || 'General Business'}
- Audience Type: ${audienceType || 'Mixed B2B/B2C'}
- Campaign Type: ${campaignType || 'Marketing/Promotional'}
- Timezone: ${timezone || 'Not specified'}
- Total Contacts: ${contacts}
- Historical Campaigns Sent: ${campaigns.length}
- Historical Open Data: ${campaigns.length > 0 ? 'Available' : 'Limited data - use industry best practices'}

Provide data-driven recommendations optimized for maximum engagement.`,
          },
        ], 800);

        try {
          result = JSON.parse(aiResponse);
        } catch {
          // If JSON parsing fails, extract what we can
          result = getDefaultSendTimeResult(timezone);
        }
      } catch (error) {
        result = getDefaultSendTimeResult(timezone);
      }
    } else {
      result = getDefaultSendTimeResult(timezone);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'SEND_TIME',
        prompt: JSON.stringify({ audienceType, campaignType, timezone, industry }),
        result: JSON.stringify(result),
      },
    });

    res.json(result);
  } catch (error) {
    console.error('AI send time optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize send time' });
  }
});

// AI Audience Segmenter
router.post('/segment', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    // Gather comprehensive contact data for AI analysis
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        campaignRecipients: true,
        customFieldValues: { include: { customField: true } },
      },
    });

    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { contacts: true } } },
    });

    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, status: 'SENT' },
      take: 20,
    });

    // Build data summary for AI
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dataContext = {
      totalContacts: contacts.length,
      newContactsLast30Days: contacts.filter(c => c.createdAt > thirtyDaysAgo).length,
      newContactsLast7Days: contacts.filter(c => c.createdAt > sevenDaysAgo).length,
      contactsWithTags: contacts.filter(c => c.tags.length > 0).length,
      subscribedContacts: contacts.filter(c => c.subscribed).length,
      unsubscribedContacts: contacts.filter(c => !c.subscribed).length,
      contactsWithEngagement: contacts.filter(c => c.campaignRecipients.some(r => r.openedAt)).length,
      tags: tags.map(t => ({ name: t.name, count: t._count.contacts })),
      campaignsSent: campaigns.length,
    };

    let suggestions: any[];

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a marketing segmentation expert. Analyze the contact data and suggest smart audience segments. Return ONLY valid JSON array with this structure:
[
  {
    "name": "Segment Name",
    "description": "Clear description of who belongs in this segment",
    "contactCount": 150,
    "priority": "high",
    "suggestedAction": "Recommended campaign or action for this segment",
    "rules": [{"field": "engagement", "operator": "gt", "value": 5}]
  }
]

Create 5-8 meaningful segments based on the data. Be specific and actionable.`,
          },
          {
            role: 'user',
            content: `Analyze this contact database and suggest smart marketing segments:

Contact Overview:
- Total contacts: ${dataContext.totalContacts}
- Subscribed: ${dataContext.subscribedContacts}
- Unsubscribed: ${dataContext.unsubscribedContacts}
- New contacts (last 7 days): ${dataContext.newContactsLast7Days}
- New contacts (last 30 days): ${dataContext.newContactsLast30Days}
- Contacts with email opens: ${dataContext.contactsWithEngagement}
- Contacts with tags: ${dataContext.contactsWithTags}

Existing Tags: ${dataContext.tags.map(t => `${t.name} (${t.count})`).join(', ') || 'None'}

Campaigns sent: ${dataContext.campaignsSent}

Suggest segments that would help improve email marketing performance, re-engagement, and personalization.`,
          },
        ], 1200);

        try {
          suggestions = JSON.parse(aiResponse);
          // Validate and adjust contact counts based on actual data
          suggestions = suggestions.map((seg: any) => ({
            ...seg,
            contactCount: Math.min(seg.contactCount || 0, contacts.length),
          }));
        } catch {
          suggestions = getDefaultSegmentSuggestions(dataContext);
        }
      } catch (error) {
        suggestions = getDefaultSegmentSuggestions(dataContext);
      }
    } else {
      suggestions = getDefaultSegmentSuggestions(dataContext);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'SEGMENTATION',
        prompt: JSON.stringify(dataContext),
        result: JSON.stringify(suggestions),
      },
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('AI segmentation error:', error);
    res.status(500).json({ error: 'Failed to generate segments' });
  }
});

// AI Campaign Suggester
router.post('/campaign-ideas', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { industry, goals, season, businessDescription } = req.body;

    // Gather user's existing data for context
    const contacts = await prisma.contact.count({ where: { userId: req.userId } });
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId },
      select: { type: true, status: true },
      take: 20,
    });
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      select: { name: true },
    });

    const dataContext = {
      totalContacts: contacts,
      campaignTypes: [...new Set(campaigns.map(c => c.type))],
      existingTags: tags.map(t => t.name),
      sentCampaigns: campaigns.filter(c => c.status === 'SENT').length,
    };

    let ideas: any[];

    if (isAIAvailable()) {
      try {
        const result = await callOpenRouter([
          {
            role: 'system',
            content: `You are an expert marketing strategist. Generate creative, actionable campaign ideas. Return ONLY valid JSON array with this structure:
[
  {
    "title": "Campaign Name",
    "description": "Detailed description of the campaign strategy",
    "type": "email",
    "targetAudience": "Who this campaign targets",
    "estimatedImpact": "high/medium/low",
    "difficulty": "easy/medium/advanced",
    "suggestedTiming": "When to run this campaign",
    "keyMetrics": ["metric1", "metric2"]
  }
]

Generate 5-6 diverse, creative campaign ideas tailored to the business.`,
          },
          {
            role: 'user',
            content: `Generate marketing campaign ideas for:

Business: ${businessDescription || industry || 'General Business'}
Industry: ${industry || 'Not specified'}
Goals: ${goals || 'Increase engagement and sales'}
Season/Timing: ${season || 'Year-round'}

Current Data:
- Total contacts: ${dataContext.totalContacts}
- Previous campaigns sent: ${dataContext.sentCampaigns}
- Existing tags: ${dataContext.existingTags.join(', ') || 'None'}
- Campaign types used: ${dataContext.campaignTypes.join(', ') || 'None yet'}

Suggest campaigns that align with their goals and existing audience. Include a mix of quick wins and longer-term strategies.`,
          },
        ], 1500);

        try {
          ideas = JSON.parse(result);
        } catch {
          ideas = generateDemoCampaignIdeas();
        }
      } catch (error) {
        ideas = generateDemoCampaignIdeas();
      }
    } else {
      ideas = generateDemoCampaignIdeas();
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'CAMPAIGN_IDEA',
        prompt: JSON.stringify({ industry, goals, season, businessDescription, dataContext }),
        result: JSON.stringify(ideas),
      },
    });

    res.json({ ideas, name: ideas[0]?.title, description: ideas[0]?.description, type: ideas[0]?.type });
  } catch (error) {
    console.error('AI campaign ideas error:', error);
    res.status(500).json({ error: 'Failed to generate campaign ideas' });
  }
});

// AI Review Response Generator
router.post('/review-response', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { reviewContent, rating, authorName } = req.body;

    let response: string;

    if (isAIAvailable()) {
      try {
        response = await callOpenRouter([
          {
            role: 'system',
            content: 'You are a professional customer service representative. Write a personalized, empathetic response to customer reviews. Keep it professional, warm, and under 150 words.',
          },
          {
            role: 'user',
            content: `Write a response to this ${rating}-star review from ${authorName}: "${reviewContent}"`,
          },
        ], 300);
      } catch (error) {
        response = getDefaultReviewResponse(rating, authorName);
      }
    } else {
      response = getDefaultReviewResponse(rating, authorName);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'REVIEW_RESPONSE',
        prompt: JSON.stringify({ reviewContent, rating, authorName }),
        result: response,
      },
    });

    res.json({ response });
  } catch (error) {
    console.error('AI review response error:', error);
    res.status(500).json({ error: 'Failed to generate review response' });
  }
});

// AI Social Media Post Generator
router.post('/social-post', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { topic, platform, tone, includeHashtags } = req.body;

    let post: string;

    if (isAIAvailable()) {
      try {
        post = await callOpenRouter([
          {
            role: 'system',
            content: `You are a social media expert. Create an engaging ${platform || 'social media'} post with a ${tone || 'professional'} tone. ${includeHashtags !== false ? 'Include 3-5 relevant hashtags.' : 'Do not include hashtags.'} Keep it under 280 characters for Twitter or appropriate length for the platform.`,
          },
          { role: 'user', content: `Create a post about: ${topic}` },
        ], 300);
      } catch (error) {
        post = getDefaultSocialPost(topic, includeHashtags);
      }
    } else {
      post = getDefaultSocialPost(topic, includeHashtags);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'SOCIAL_POST',
        prompt: JSON.stringify({ topic, platform, tone, includeHashtags }),
        result: post,
      },
    });

    res.json({ post });
  } catch (error) {
    console.error('AI social post error:', error);
    res.status(500).json({ error: 'Failed to generate social post' });
  }
});

// AI Ad Copy Generator
router.post('/ad-copy', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { product, targetAudience, platform, callToAction } = req.body;

    let adCopy: any;

    if (isAIAvailable()) {
      try {
        const result = await callOpenRouter([
          {
            role: 'system',
            content: 'You are an advertising copywriter. Create compelling ad copy. Return ONLY a JSON object with these exact fields: headline, body, cta. No other text.',
          },
          {
            role: 'user',
            content: `Create ${platform || 'digital'} ad copy for: ${product}. Target audience: ${targetAudience || 'general'}. CTA: ${callToAction || 'Learn More'}`,
          },
        ], 500);

        try {
          adCopy = JSON.parse(result);
        } catch {
          adCopy = getDefaultAdCopy(product, callToAction);
        }
      } catch (error) {
        adCopy = getDefaultAdCopy(product, callToAction);
      }
    } else {
      adCopy = getDefaultAdCopy(product, callToAction);
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'AD_COPY',
        prompt: JSON.stringify({ product, targetAudience, platform, callToAction }),
        result: JSON.stringify(adCopy),
      },
    });

    res.json({ ...adCopy, adCopy });
  } catch (error) {
    console.error('AI ad copy error:', error);
    res.status(500).json({ error: 'Failed to generate ad copy' });
  }
});

// AI Performance Predictor
router.post('/predict', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { campaignType, audienceSize, content } = req.body;

    const historicalCampaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, type: campaignType, status: 'SENT' },
      include: {
        analytics: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
      take: 20,
    });

    let avgOpenRate = 22;
    let avgClickRate = 3;
    let avgConversionRate = 1;

    if (historicalCampaigns.length > 0) {
      const withAnalytics = historicalCampaigns.filter(c => c.analytics.length > 0);
      if (withAnalytics.length > 0) {
        avgOpenRate = withAnalytics.reduce((sum, c) => {
          const a = c.analytics[0];
          return sum + (a.totalSent > 0 ? a.opened / a.totalSent * 100 : 0);
        }, 0) / withAnalytics.length;

        avgClickRate = withAnalytics.reduce((sum, c) => {
          const a = c.analytics[0];
          return sum + (a.opened > 0 ? a.clicked / a.opened * 100 : 0);
        }, 0) / withAnalytics.length;

        avgConversionRate = withAnalytics.reduce((sum, c) => {
          const a = c.analytics[0];
          return sum + (a.clicked > 0 ? a.conversions / a.clicked * 100 : 0);
        }, 0) / withAnalytics.length;
      }
    }

    const prediction = {
      estimatedOpenRate: `${avgOpenRate.toFixed(1)}%`,
      estimatedClickRate: `${avgClickRate.toFixed(1)}%`,
      estimatedConversions: Math.round((audienceSize || 1000) * (avgClickRate / 100) * (avgConversionRate / 100)),
      confidence: Math.min(85, 40 + historicalCampaigns.length * 2),
      recommendations: [
        avgOpenRate < 20 ? 'Consider improving subject lines' : 'Subject line performance is good',
        avgClickRate < 2.5 ? 'Add more compelling CTAs' : 'CTAs are performing well',
        'Test different send times for better results',
      ],
    };

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'PREDICTION',
        prompt: JSON.stringify({ campaignType, audienceSize }),
        result: JSON.stringify(prediction),
      },
    });

    res.json(prediction);
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// AI Image Generator (placeholder)
router.post('/image', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { prompt, style, size } = req.body;

    const result = {
      imageUrl: `https://via.placeholder.com/${size || '512x512'}?text=${encodeURIComponent(prompt?.slice(0, 20) || 'Image')}`,
      prompt,
      style,
      size: size || '512x512',
      note: 'Image generation placeholder - integrate with DALL-E or similar for actual image generation',
    };

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'IMAGE',
        prompt: prompt || '',
        result: JSON.stringify(result),
        metadata: JSON.stringify({ style, size }),
      },
    });

    res.json(result);
  } catch (error) {
    console.error('AI image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Get AI generation history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, limit = '50' } = req.query;

    const where: any = { userId: req.userId };
    if (type) where.type = type;

    const history = await prisma.aIGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(history);
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Helper functions
function generateDemoContent(type: string, prompt: string): string {
  const templates: Record<string, string> = {
    blog: `# ${prompt || 'Your Topic'}\n\nIn today's competitive market, understanding your audience is crucial. This comprehensive guide will walk you through the essential strategies for ${prompt || 'business growth'}.\n\n## Key Takeaways\n\n1. Know your target audience inside and out\n2. Create valuable content that solves problems\n3. Build authentic relationships with your customers\n4. Measure and optimize your results\n\nStart implementing these strategies today and watch your business thrive!`,
    email: `Subject: Your Exclusive Offer Awaits!\n\nDear Valued Customer,\n\nWe're excited to share something special with you. Based on your interests in "${prompt || 'our products'}", we've crafted an exclusive offer just for you.\n\nFor a limited time, enjoy:\n• 20% off your next purchase\n• Free shipping on orders over $50\n• Early access to new arrivals\n\nDon't miss out on this opportunity!\n\nBest regards,\nYour Marketing Team`,
    ad: `Discover the difference with ${prompt || 'our product'}!\n\nJoin thousands of satisfied customers who have transformed their experience. Limited time offer - Act now!\n\n✓ Premium Quality\n✓ Fast Delivery\n✓ 100% Satisfaction Guaranteed\n\nShop Now →`,
    social: `Exciting news! ${prompt || 'We have something special to share!'}\n\nWe can't wait to hear what you think. Drop a comment below!\n\n#marketing #business #growth #success`,
    landing: `# Transform Your ${prompt || 'Experience'} Today\n\nJoin over 10,000 satisfied customers who have discovered the power of our solution.\n\n## Why Choose Us?\n\n- Industry-leading results\n- 24/7 customer support\n- Money-back guarantee\n\n[Get Started Now] [Learn More]`,
  };

  return templates[type] || templates.email;
}

function getDefaultSubjectLines(count: number): string[] {
  const lines = [
    'Exclusive offer just for you - Open now!',
    "Don't miss out on this limited-time opportunity",
    'Your special invitation awaits inside',
    'Limited time: Act now and save big!',
    'We have something special for you today',
    'Breaking: New deals you need to see',
    "Here's what you've been waiting for",
    'Quick question for you (takes 30 seconds)',
    'Your feedback requested - Help us improve',
    'Last chance: Offer expires tonight!',
  ];
  return lines.slice(0, count);
}

function getDefaultReviewResponse(rating: number, authorName: string): string {
  if (rating >= 4) {
    return `Thank you so much for your wonderful ${rating}-star review, ${authorName}! We're thrilled to hear about your positive experience. Your support means the world to us, and we look forward to serving you again soon!`;
  }
  return `Thank you for taking the time to share your feedback, ${authorName}. We're sorry to hear that your experience didn't meet expectations. We take your concerns seriously and would love the opportunity to make things right. Please reach out to us directly so we can address this personally.`;
}

function getDefaultSocialPost(topic: string, includeHashtags: boolean): string {
  const hashtags = includeHashtags !== false ? '\n\n#business #growth #success #marketing #smallbusiness' : '';
  return `${topic || 'Exciting things are happening!'}\n\nWe're always working to bring you the best. Stay tuned for more updates!${hashtags}`;
}

function getDefaultAdCopy(product: string, callToAction: string): any {
  return {
    headline: `Discover ${product || 'Our Solution'}`,
    body: `Transform your experience with ${product || 'our premium offering'}. Join thousands of satisfied customers today!`,
    cta: callToAction || 'Learn More',
  };
}

function generateDemoCampaignIdeas(): any[] {
  return [
    {
      title: 'Welcome Series',
      description: 'Automated email sequence for new subscribers with personalized onboarding content',
      type: 'email',
      targetAudience: 'New subscribers',
      estimatedImpact: 'high',
      difficulty: 'easy',
      suggestedTiming: 'Immediately after signup',
      keyMetrics: ['Open rate', 'Click rate', 'Conversion rate'],
    },
    {
      title: 'Flash Sale Alert',
      description: 'Limited-time discount announcement to drive urgency and conversions',
      type: 'sms',
      targetAudience: 'Previous customers',
      estimatedImpact: 'high',
      difficulty: 'easy',
      suggestedTiming: 'Weekend or end of month',
      keyMetrics: ['Revenue', 'Conversion rate', 'Response time'],
    },
    {
      title: 'Customer Appreciation Week',
      description: 'Multi-channel campaign thanking loyal customers with exclusive offers',
      type: 'multi-channel',
      targetAudience: 'VIP customers',
      estimatedImpact: 'medium',
      difficulty: 'medium',
      suggestedTiming: 'Quarterly',
      keyMetrics: ['Engagement', 'Retention rate', 'NPS'],
    },
    {
      title: 'Educational Content Series',
      description: 'Weekly tips and industry insights to build authority and trust',
      type: 'email',
      targetAudience: 'All subscribers',
      estimatedImpact: 'medium',
      difficulty: 'medium',
      suggestedTiming: 'Weekly',
      keyMetrics: ['Open rate', 'Shares', 'Time on page'],
    },
    {
      title: 'Re-engagement Campaign',
      description: 'Win back inactive customers with personalized offers and reminders',
      type: 'email',
      targetAudience: 'Inactive 60+ days',
      estimatedImpact: 'high',
      difficulty: 'easy',
      suggestedTiming: 'After 60 days of inactivity',
      keyMetrics: ['Reactivation rate', 'Revenue recovered', 'Unsubscribe rate'],
    },
  ];
}

function getDefaultSendTimeResult(timezone?: string): any {
  return {
    bestDay: 'Tuesday',
    bestTime: '10:00 AM',
    alternativeDay: 'Thursday',
    alternativeTime: '2:00 PM',
    confidence: 75,
    reasoning: 'Based on industry best practices for email marketing engagement.',
    recommendations: [
      'Tuesday and Thursday typically have highest email open rates',
      'Mid-morning (9-11 AM) catches people during work breaks',
      'Avoid Monday mornings when inboxes are full',
      'Consider your audience timezone for optimal delivery',
    ],
    avoidTimes: ['Saturday morning', 'Sunday', 'Monday before 10 AM', 'Friday after 3 PM'],
    industryInsights: 'B2B emails perform best mid-week, while B2C can see good results on weekends.',
  };
}

function getDefaultSegmentSuggestions(dataContext: any): any[] {
  const suggestions = [];

  if (dataContext.newContactsLast7Days > 0) {
    suggestions.push({
      name: 'New Subscribers (7 days)',
      description: 'Contacts who signed up in the last week - perfect for welcome campaigns',
      contactCount: dataContext.newContactsLast7Days,
      priority: 'high',
      suggestedAction: 'Send welcome email series with onboarding content',
      rules: [{ field: 'createdAt', operator: 'gte', value: '7_days_ago' }],
    });
  }

  if (dataContext.contactsWithEngagement > 0) {
    suggestions.push({
      name: 'Engaged Subscribers',
      description: 'Contacts who have opened at least one email - your most active audience',
      contactCount: dataContext.contactsWithEngagement,
      priority: 'high',
      suggestedAction: 'Send exclusive offers and premium content',
      rules: [{ field: 'hasOpened', operator: 'eq', value: true }],
    });
  }

  const inactiveCount = dataContext.totalContacts - dataContext.contactsWithEngagement;
  if (inactiveCount > 0) {
    suggestions.push({
      name: 'Needs Re-engagement',
      description: 'Contacts who havent opened any emails - try a win-back campaign',
      contactCount: inactiveCount,
      priority: 'medium',
      suggestedAction: 'Send re-engagement campaign with special incentive',
      rules: [{ field: 'hasOpened', operator: 'eq', value: false }],
    });
  }

  if (dataContext.unsubscribedContacts > 0) {
    suggestions.push({
      name: 'Unsubscribed',
      description: 'Contacts who opted out - review for feedback patterns',
      contactCount: dataContext.unsubscribedContacts,
      priority: 'low',
      suggestedAction: 'Analyze unsubscribe reasons and improve content',
      rules: [{ field: 'subscribed', operator: 'eq', value: false }],
    });
  }

  // Tag-based suggestions
  dataContext.tags.slice(0, 3).forEach((tag: any) => {
    if (tag.count > 0) {
      suggestions.push({
        name: `${tag.name} Segment`,
        description: `Contacts tagged as "${tag.name}" - create targeted campaigns`,
        contactCount: tag.count,
        priority: 'medium',
        suggestedAction: `Send personalized content for ${tag.name} interests`,
        rules: [{ field: 'hasTag', operator: 'eq', value: tag.name }],
      });
    }
  });

  if (suggestions.length === 0) {
    suggestions.push(
      {
        name: 'All Active Subscribers',
        description: 'Your full subscriber base',
        contactCount: dataContext.totalContacts,
        priority: 'medium',
        suggestedAction: 'Start building engagement history with regular newsletters',
      },
      {
        name: 'VIP Potential',
        description: 'Top 10% most engaged contacts',
        contactCount: Math.ceil(dataContext.totalContacts * 0.1),
        priority: 'high',
        suggestedAction: 'Create exclusive offers for your best customers',
      },
    );
  }

  return suggestions;
}

export default router;
