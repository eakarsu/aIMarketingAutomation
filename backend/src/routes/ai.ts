import { Router, Response } from 'express';
import { PrismaClient, AIGenerationType } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// OpenRouter API call helper
async function callOpenRouter(messages: { role: string; content: string }[], maxTokens = 4096): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('NO_API_KEY');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:4000',
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

  const data: any = await response.json();
  let content = data.choices?.[0]?.message?.content || '';

  // Strip markdown code fences (```json ... ``` or ``` ... ```) that AI models often wrap JSON in
  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return content.trim();
}

// Attempt to repair truncated JSON from AI responses
function repairJSON(text: string): any {
  // First try parsing as-is
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }

  // Try to find and extract valid JSON object or array
  let cleaned = text.trim();

  // Remove any trailing incomplete values and close brackets
  // Count open vs close braces and brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  let lastValidPos = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') braceCount++;
    if (ch === '}') { braceCount--; if (braceCount === 0 && bracketCount === 0) lastValidPos = i + 1; }
    if (ch === '[') bracketCount++;
    if (ch === ']') { bracketCount--; if (braceCount === 0 && bracketCount === 0) lastValidPos = i + 1; }
  }

  // If we found a complete top-level object/array, extract it
  if (lastValidPos > 0) {
    try {
      return JSON.parse(cleaned.substring(0, lastValidPos));
    } catch {
      // continue to more aggressive repair
    }
  }

  // Aggressive repair: close any open strings, arrays, and objects
  if (inString) cleaned += '"';
  // Remove any trailing incomplete key-value pairs (e.g., trailing comma + incomplete key)
  cleaned = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
  cleaned = cleaned.replace(/,\s*$/, '');
  while (bracketCount > 0) { cleaned += ']'; bracketCount--; }
  while (braceCount > 0) { cleaned += '}'; braceCount--; }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[AI] JSON repair failed, length:', text.length);
    // Log the problematic area around the error position
    const match = String(e).match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      console.error('[AI] JSON error around position', pos, ':', JSON.stringify(cleaned.substring(Math.max(0, pos - 100), pos + 100)));
    }
    throw e;
  }
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
            content: `You are an elite marketing copywriter with 15+ years of experience crafting high-converting content for top brands. You specialize in ${type || 'marketing'} content that drives engagement, builds trust, and converts readers into customers.

Your writing style guidelines:
- Tone: ${tone || 'professional'} — adapt vocabulary, sentence structure, and emotional register accordingly
- Length: ${length || 'medium'} — short means 100-200 words, medium means 300-500 words, long means 600-1000 words
- Use compelling headlines, subheadings, and bullet points for readability
- Include a strong opening hook that grabs attention in the first sentence
- Weave in persuasive techniques: social proof, urgency, benefits over features, emotional triggers
- End with a clear call-to-action that motivates the reader to take the next step
- Use power words and active voice throughout
- For blog posts: include an intro, 3-5 key sections with subheadings, and a conclusion
- For emails: include subject line suggestion, preview text, body, and CTA
- For ads: include headline, body copy, and CTA button text
- For social posts: keep platform-appropriate length and include hashtag suggestions`,
          },
          { role: 'user', content: prompt || `Write compelling ${type || 'marketing'} content about: ${topic}.\n\nTarget keywords to naturally incorporate: ${keywords?.join(', ') || 'none specified'}\n\nMake it engaging, actionable, and optimized for conversions. Include specific examples and data points where relevant.` },
        ], 4000);
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
            content: `You are a world-class email marketing strategist who has optimized subject lines for Fortune 500 companies, achieving open rates 40%+ above industry averages. You deeply understand the psychology of email opens.

Generate exactly ${count} compelling email subject lines using these proven techniques:
- Curiosity gap: Tease value without revealing everything
- Personalization: Use "you/your" to speak directly to the reader
- Urgency & scarcity: Time-limited or quantity-limited language where appropriate
- Numbers & specifics: Concrete figures outperform vague promises (e.g., "5 ways" beats "several ways")
- Emotional triggers: Fear of missing out, excitement, exclusivity, surprise
- Power words: Free, new, proven, secret, instant, guaranteed, exclusive, limited
- Length optimization: Keep between 30-50 characters for mobile (6-10 words)
- Avoid spam triggers: No ALL CAPS, excessive punctuation, or spammy words

For each subject line, use a DIFFERENT technique so the user has diverse options to A/B test.

Return ONLY the subject lines, one per line, without numbering, bullet points, or explanations.`,
          },
          { role: 'user', content: `Here is the email content/context to write subject lines for:\n\n${content}\n\nGenerate ${count} diverse, high-converting subject lines that would make the recipient immediately want to open this email.` },
        ], 4000);
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
            content: `You are a senior email deliverability and engagement optimization expert with deep expertise in send-time optimization across dozens of industries. You have access to aggregated benchmark data from millions of email campaigns.

Your analysis framework considers:
- Day-of-week engagement patterns by industry and audience type
- Time-of-day open/click curves segmented by B2B vs B2C
- Timezone distribution effects on global audiences
- Mobile vs desktop open patterns throughout the day
- Seasonal and holiday calendar impacts
- Campaign type (transactional vs promotional vs newsletter) timing differences
- Inbox competition analysis (when competitors typically send)
- The "golden hours" phenomenon for different verticals

Provide a comprehensive, data-backed recommendation with actionable insights.

Return ONLY this exact JSON structure:
{
  "bestDay": "Tuesday",
  "bestTime": "10:00 AM",
  "alternativeDay": "Thursday",
  "alternativeTime": "2:00 PM",
  "confidence": 85,
  "reasoning": "Detailed 2-3 sentence explanation citing specific data points and industry benchmarks",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4", "recommendation 5"],
  "avoidTimes": ["Saturday morning", "Monday 8-9 AM", "Friday after 4 PM"],
  "industryInsights": "Specific, detailed insight for this exact industry with benchmark data"
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Perform a comprehensive send-time analysis for this email marketing program:

BUSINESS CONTEXT:
- Industry: ${industry || 'General Business'}
- Audience Type: ${audienceType || 'Mixed B2B/B2C'}
- Campaign Type: ${campaignType || 'Marketing/Promotional'}
- Timezone: ${timezone || 'Not specified'}

CURRENT DATA:
- Total Contact List Size: ${contacts}
- Historical Campaigns Sent: ${campaigns.length}
- Historical Open Data: ${campaigns.length > 0 ? 'Available — factor this into confidence level' : 'Limited data — rely on industry best practices and benchmarks'}

Please provide data-driven recommendations that account for this specific industry's audience behavior patterns, inbox competition, and optimal engagement windows. Include specific percentage benchmarks where possible.`,
          },
        ], 4000);

        try {
          result = repairJSON(aiResponse);
        } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
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
      subscribedContacts: contacts.filter(c => c.status === 'ACTIVE').length,
      unsubscribedContacts: contacts.filter(c => c.status === 'UNSUBSCRIBED').length,
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
            content: `You are a customer segmentation strategist specializing in data-driven audience analysis for email marketing. You use RFM (Recency, Frequency, Monetary) analysis principles, behavioral clustering, and lifecycle stage mapping to create high-impact segments.

Your segmentation philosophy:
- Every segment must have a clear, actionable purpose tied to a specific campaign type
- Segments should be mutually exclusive where possible to avoid message fatigue
- Prioritize segments by revenue potential and engagement likelihood
- Include both "quick win" segments (easy to activate) and "strategic" segments (longer-term value)
- Consider the full customer lifecycle: acquisition, activation, retention, reactivation, and winback
- Factor in engagement velocity (trending up vs trending down) not just current state

Return ONLY this exact JSON structure:
[
  {
    "name": "Descriptive Segment Name",
    "description": "Detailed 2-3 sentence description of who belongs in this segment and why they matter",
    "contactCount": 150,
    "priority": "high",
    "suggestedAction": "Specific, detailed campaign recommendation with subject line idea and timing",
    "rules": [{"field": "engagement", "operator": "gt", "value": 5}]
  }
]

Create 5-8 meaningful, diverse segments covering different lifecycle stages and engagement levels.

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Perform a deep audience segmentation analysis on this contact database:

DATABASE OVERVIEW:
- Total contacts: ${dataContext.totalContacts}
- Subscribed (active): ${dataContext.subscribedContacts}
- Unsubscribed: ${dataContext.unsubscribedContacts}
- New contacts (last 7 days): ${dataContext.newContactsLast7Days}
- New contacts (last 30 days): ${dataContext.newContactsLast30Days}
- Contacts who opened emails: ${dataContext.contactsWithEngagement}
- Contacts with tags: ${dataContext.contactsWithTags}

EXISTING TAGS: ${dataContext.tags.map(t => `${t.name} (${t.count} contacts)`).join(', ') || 'None yet'}

CAMPAIGN HISTORY: ${dataContext.campaignsSent} campaigns sent

Based on this data, create smart segments that will maximize engagement, reduce churn, drive conversions, and help personalize the email marketing program. For each segment, provide specific campaign ideas with timing recommendations.`,
          },
        ], 4000);

        try {
          suggestions = repairJSON(aiResponse);
          // Validate and adjust contact counts based on actual data
          suggestions = suggestions.map((seg: any) => ({
            ...seg,
            contactCount: Math.min(seg.contactCount || 0, contacts.length),
          }));
        } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
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
            content: `You are a senior marketing strategist and campaign architect who has planned and executed campaigns generating millions in revenue across e-commerce, SaaS, local businesses, and enterprise. You think in terms of full-funnel strategy and customer lifecycle.

Your campaign ideation framework:
- Always include a mix of: quick-win campaigns (launch in <1 day), medium-effort campaigns (1-2 weeks), and strategic long-term campaigns
- Each campaign should have a clear ROI hypothesis and measurable success criteria
- Consider multi-channel orchestration: email + SMS + social + retargeting working together
- Factor in seasonality, industry events, and competitive timing
- Recommend specific automation triggers and sequences, not just one-off sends
- Include personalization strategies for each campaign
- Think about the full customer journey: awareness → consideration → purchase → retention → advocacy

Return ONLY this exact JSON structure:
[
  {
    "title": "Creative Campaign Name",
    "description": "Detailed 3-4 sentence strategy description including the core value proposition, sequence of touchpoints, and expected customer journey",
    "type": "email",
    "targetAudience": "Specific audience description with demographics/behavior",
    "estimatedImpact": "high/medium/low",
    "difficulty": "easy/medium/advanced",
    "suggestedTiming": "Specific timing recommendation with rationale",
    "keyMetrics": ["metric1", "metric2", "metric3"]
  }
]

Generate 5-6 diverse, creative campaign ideas that cover different parts of the marketing funnel.

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Design a comprehensive campaign strategy for this business:

BUSINESS PROFILE:
- Description: ${businessDescription || industry || 'General Business'}
- Industry: ${industry || 'Not specified'}
- Strategic Goals: ${goals || 'Increase engagement and sales'}
- Season/Timing Context: ${season || 'Year-round — suggest seasonal hooks'}

CURRENT MARKETING DATA:
- Contact list size: ${dataContext.totalContacts}
- Campaigns already sent: ${dataContext.sentCampaigns}
- Existing audience tags: ${dataContext.existingTags.join(', ') || 'None — suggest tagging strategy'}
- Campaign types used so far: ${dataContext.campaignTypes.join(', ') || 'None yet — this is a new program'}

Generate campaigns that build on their existing data, align with their goals, and include a mix of quick wins they can launch today and strategic initiatives for sustained growth. Be specific and creative — avoid generic ideas.`,
          },
        ], 4000);

        try {
          ideas = repairJSON(result);
        } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
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
            content: `You are an expert reputation management specialist who crafts review responses that build brand loyalty and turn critics into advocates. You understand the psychology of public-facing customer interactions.

Your response strategy by rating:
- 5 stars: Express genuine gratitude, reinforce their positive experience, mention specific details they praised, encourage them to share with friends or return
- 4 stars: Thank warmly, acknowledge the positive, gently address any implied gaps, invite them back to experience improvements
- 3 stars: Balance gratitude with genuine concern, address specific issues mentioned, offer a concrete next step or solution, show you value their honest feedback
- 2 stars: Lead with empathy and sincere apology, take responsibility without being defensive, address each concern specifically, offer to make it right with a clear action (direct contact, refund, replacement)
- 1 star: Immediate empathy and sincere apology, never argue or dismiss, acknowledge their frustration is valid, provide a specific resolution path, offer direct contact for immediate help

Writing style guidelines:
- Always address the reviewer by name to personalize
- Reference specific details from their review to show you actually read it
- Keep responses 100-200 words — concise but substantive
- Never use generic copy-paste language
- End with a forward-looking statement that invites continued relationship
- Maintain brand professionalism while being genuinely human and warm`,
          },
          {
            role: 'user',
            content: `Craft a thoughtful, personalized response to this customer review:

Rating: ${rating} out of 5 stars
Reviewer: ${authorName || 'Anonymous Customer'}
Review Content: "${reviewContent}"

Write a response that addresses their specific points, shows genuine care, and strengthens the brand relationship. If the rating is low, include a concrete resolution offer.`,
          },
        ], 4000);
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
            content: `You are a top-tier social media content strategist who has grown brands to millions of followers. You understand the unique algorithms, audience behaviors, and content formats that drive engagement on each platform.

Platform-specific expertise:
- Instagram: Visual storytelling, carousel-worthy hooks, strong first line, line breaks for readability, 5-15 strategic hashtags, emoji usage, CTA in bio mention
- Twitter/X: Punchy hooks under 280 chars, thread-worthy openings, controversial/surprising takes, quote-tweet bait, 1-3 hashtags max
- LinkedIn: Professional thought leadership, storytelling with business lessons, data-driven insights, paragraph breaks, industry hashtags, engagement questions
- TikTok: Trend-aware captions, hook in first 3 words, conversational/Gen-Z tone, trending hashtags, CTA for comments
- Facebook: Community-building tone, shareable content, questions that spark discussion, longer form acceptable, minimal hashtags

Writing guidelines for this post:
- Platform: ${platform || 'social media'} — follow that platform's best practices exactly
- Tone: ${tone || 'professional'} — adapt voice, vocabulary, and energy level
- ${includeHashtags !== false ? 'Include 3-8 strategic hashtags mixing popular and niche for discoverability' : 'Do not include any hashtags'}
- Open with a scroll-stopping hook — the first line must grab attention
- Include a clear call-to-action (comment, share, save, click link, etc.)
- Use line breaks and formatting appropriate to the platform
- Add relevant emojis that enhance (not clutter) the message`,
          },
          { role: 'user', content: `Create a highly engaging ${platform || 'social media'} post about: ${topic}\n\nMake it authentic, share-worthy, and optimized for maximum engagement on this specific platform. The post should feel native to the platform, not like a generic cross-post.` },
        ], 4000);
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
            content: `You are a performance advertising copywriter who has managed millions in ad spend across Google, Facebook, Instagram, LinkedIn, and TikTok. You write ads that achieve CTRs 2-3x above industry benchmarks.

Your ad copy framework:
- Headline: 5-10 words maximum, must stop the scroll. Use proven formulas: number + benefit, question hook, bold claim, before/after contrast, or social proof
- Body: 2-4 sentences. Lead with the #1 pain point or desire, present the product as the solution, include one specific proof point (statistic, testimonial snippet, or result), create urgency
- CTA: Action-oriented verb + specific benefit (e.g., "Start Saving Today" not just "Learn More")

Platform-specific ad guidelines:
- Facebook/Instagram: Emotional storytelling, benefit-focused, social proof, conversational
- Google Search: Intent-matching, keyword-rich, specific numbers, competitive differentiation
- LinkedIn: Professional value prop, ROI-focused, industry-specific language, thought leadership angle
- TikTok: Native, casual, trend-aware, authentic voice, less "ad-like"

Persuasion techniques to weave in: social proof, scarcity, authority, reciprocity, loss aversion.

Return ONLY this exact JSON structure: {"headline": "...", "body": "...", "cta": "..."}. No other text.

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Create high-converting ${platform || 'digital'} ad copy for:

Product/Service: ${product}
Target Audience: ${targetAudience || 'general audience'}
Desired CTA: ${callToAction || 'Learn More'}

Write ad copy that speaks directly to this audience's pain points, positions the product as the ideal solution, and creates an irresistible urge to click. Make every word earn its place.`,
          },
        ], 4000);

        try {
          adCopy = repairJSON(result);
        } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
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

// ============= AI SEGMENT BUILDER =============
router.get('/segments', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const segments = await prisma.aISegment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(segments);
  } catch (error) {
    console.error('Get AI segments error:', error);
    res.status(500).json({ error: 'Failed to get segments' });
  }
});

router.get('/segments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const segment = await prisma.aISegment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    res.json(segment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get segment' });
  }
});

router.post('/segments/build', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { goal, targetAudience, behaviors } = req.body;

    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: { tags: { include: { tag: true } }, campaignRecipients: true },
    });

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are an advanced audience segmentation architect who builds precision-targeted segments using behavioral data, engagement patterns, and predictive analytics. You think in terms of customer lifetime value, engagement velocity, and conversion probability.

Your segment building methodology:
- Define segments using multiple overlapping criteria for precision (behavioral + demographic + engagement)
- Estimate segment sizes conservatively based on real data provided
- Provide confidence scores based on data quality and criteria specificity
- Generate actionable insights that explain WHY this segment matters and what makes them unique
- Recommend specific, detailed campaign strategies tailored to each segment's characteristics
- Consider both inclusion and exclusion criteria for clean targeting

Return ONLY this exact JSON structure:
{
  "name": "Descriptive Segment Name",
  "description": "Detailed 2-3 sentence description explaining who is in this segment and their value",
  "criteria": [{"field": "string", "operator": "string", "value": "string"}],
  "estimatedSize": 150,
  "confidence": 85,
  "insights": ["data-backed insight 1", "behavioral pattern insight 2", "opportunity insight 3", "risk insight 4"],
  "recommendations": ["specific campaign action 1", "personalization strategy 2", "timing recommendation 3"]
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Build a precision-targeted audience segment with the following parameters:

SEGMENT GOAL: ${goal || 'Increase engagement'}
TARGET AUDIENCE DESCRIPTION: ${targetAudience || 'All contacts'}
KEY BEHAVIORS TO INCLUDE: ${behaviors || 'General engagement behaviors'}
TOTAL CONTACTS IN DATABASE: ${contacts.length}

Create a well-defined segment with specific, implementable criteria. Provide deep insights about what makes this group valuable and detailed recommendations for how to engage them effectively. Estimate the segment size as a realistic percentage of the total database.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultSegmentBuild(goal, contacts.length);
      }
    } else {
      result = getDefaultSegmentBuild(goal, contacts.length);
    }

    const segment = await prisma.aISegment.create({
      data: {
        userId: req.userId!,
        name: result.name,
        description: result.description,
        criteria: JSON.stringify(result.criteria),
        contactCount: Math.min(result.estimatedSize || 0, contacts.length),
        confidence: result.confidence || 75,
        insights: JSON.stringify(result.insights || []),
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'SEGMENT_BUILDER',
        prompt: JSON.stringify({ goal, targetAudience, behaviors }),
        result: JSON.stringify(result),
      },
    });

    res.json({ ...segment, parsedCriteria: result.criteria, parsedInsights: result.insights, recommendations: result.recommendations });
  } catch (error) {
    console.error('AI segment build error:', error);
    res.status(500).json({ error: 'Failed to build segment' });
  }
});

router.put('/segments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, status } = req.body;
    const segment = await prisma.aISegment.update({
      where: { id: req.params.id },
      data: { name, description, status },
    });
    res.json(segment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

router.delete('/segments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aISegment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// ============= AI JOURNEY OPTIMIZER =============
router.get('/journeys', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const journeys = await prisma.aIJourney.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(journeys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get journeys' });
  }
});

router.get('/journeys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const journey = await prisma.aIJourney.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!journey) return res.status(404).json({ error: 'Journey not found' });
    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get journey' });
  }
});

router.post('/journeys/optimize', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { journeyType, goal, currentStages } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a customer experience architect and conversion optimization expert who designs journeys that guide prospects from first touch to loyal advocate. You apply behavioral psychology, multi-channel orchestration, and data-driven decision points to maximize conversion at every stage.

Your journey optimization framework:
- Map the complete emotional and decision-making arc of the customer
- Design 4-6 distinct stages with clear entry/exit criteria and success metrics
- Specify exact channels, content types, and timing for each touchpoint
- Build in decision branches: what happens when someone engages vs. doesn't engage
- Include wait times, frequency caps, and fatigue prevention
- Add personalization triggers based on behavior (opened, clicked, visited, purchased)
- Design re-engagement loops for contacts who stall at any stage
- Provide realistic conversion rate estimates based on industry benchmarks

Return ONLY this exact JSON structure:
{
  "name": "Descriptive Journey Name",
  "description": "Detailed 2-3 sentence description of the journey's purpose and expected outcome",
  "stages": [
    {"name": "Stage Name", "order": 1, "channels": ["channel1", "channel2"], "actions": ["specific action 1", "specific action 2"], "duration": "1-2 weeks"}
  ],
  "touchpoints": [{"channel": "email", "timing": "Day 1", "content": "Specific email description with subject line idea"}],
  "recommendations": ["detailed recommendation 1", "detailed recommendation 2", "detailed recommendation 3"],
  "conversionRate": 15.5,
  "improvements": ["specific improvement with expected impact 1", "specific improvement 2", "specific improvement 3"]
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Design and optimize a comprehensive customer journey:

JOURNEY TYPE: ${journeyType || 'Lead to Customer'}
PRIMARY GOAL: ${goal || 'Increase conversions'}
CURRENT JOURNEY STATE: ${currentStages || 'No existing journey — design from scratch'}

Create a detailed, multi-stage journey with specific touchpoints, timing, content recommendations, and channel mix for each stage. Include realistic conversion rate projections and specific improvements that would have the highest impact. Think about what happens when contacts don't engage at each stage.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultJourneyOptimization(journeyType);
      }
    } else {
      result = getDefaultJourneyOptimization(journeyType);
    }

    const journey = await prisma.aIJourney.create({
      data: {
        userId: req.userId!,
        name: result.name,
        description: result.description,
        stages: JSON.stringify(result.stages),
        touchpoints: JSON.stringify(result.touchpoints),
        recommendations: JSON.stringify(result.recommendations),
        conversionRate: result.conversionRate || 0,
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'JOURNEY_OPTIMIZER',
        prompt: JSON.stringify({ journeyType, goal }),
        result: JSON.stringify(result),
      },
    });

    res.json({ ...journey, parsedStages: result.stages, parsedTouchpoints: result.touchpoints, parsedRecommendations: result.recommendations, improvements: result.improvements });
  } catch (error) {
    console.error('AI journey optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize journey' });
  }
});

router.put('/journeys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, status } = req.body;
    const journey = await prisma.aIJourney.update({
      where: { id: req.params.id },
      data: { name, description, status },
    });
    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update journey' });
  }
});

router.delete('/journeys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIJourney.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete journey' });
  }
});

// ============= AI ATTRIBUTION MODELER =============
router.get('/attributions', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const attributions = await prisma.aIAttribution.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attributions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get attributions' });
  }
});

router.get('/attributions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const attribution = await prisma.aIAttribution.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!attribution) return res.status(404).json({ error: 'Attribution not found' });
    res.json(attribution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get attribution' });
  }
});

router.post('/attributions/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { modelType, channels, timeframe } = req.body;

    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, status: 'SENT' },
      include: { analytics: true },
      take: 50,
    });

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a marketing analytics and attribution modeling expert with deep expertise in multi-touch attribution, marketing mix modeling, and incrementality testing. You help CMOs understand the true ROI of every marketing dollar.

Your attribution analysis approach:
- Apply the specified attribution model accurately (first-touch credits acquisition, last-touch credits conversion, linear distributes evenly, time-decay weights recent interactions, data-driven uses algorithmic weighting)
- Identify cross-channel synergies where channels assist each other
- Calculate both attributed revenue AND assisted revenue for each channel
- Highlight diminishing returns and saturation points per channel
- Provide specific, actionable budget reallocation recommendations backed by the data
- Include channel-specific CPA (cost per acquisition) and ROAS estimates
- Note channels that are under-invested vs over-invested relative to their contribution

Ensure attribution percentages across all channels sum to exactly 100%.

Return ONLY this exact JSON structure:
{
  "name": "Attribution Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}",
  "modelType": "data-driven",
  "channels": [
    {"name": "Email", "attribution": 35, "conversions": 150, "revenue": 15000},
    {"name": "Social", "attribution": 25, "conversions": 100, "revenue": 10000}
  ],
  "insights": ["detailed data-backed insight 1", "cross-channel synergy insight 2", "efficiency insight 3"],
  "recommendations": ["specific reallocation recommendation 1", "optimization recommendation 2", "testing recommendation 3"],
  "totalRevenue": 41000,
  "totalConversions": 410
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Perform a comprehensive marketing attribution analysis:

ATTRIBUTION MODEL: ${modelType || 'data-driven'} — apply this model's logic to distribute credit
MARKETING CHANNELS TO ANALYZE: ${channels?.join(', ') || 'Email, Social, Paid Search, Organic'}
ANALYSIS TIMEFRAME: ${timeframe || 'Last 30 days'}
HISTORICAL CAMPAIGN DATA: ${campaigns.length} campaigns available for analysis

Provide a detailed attribution breakdown with realistic revenue and conversion numbers. Include insights about channel interactions, efficiency opportunities, and specific recommendations for budget optimization. Highlight any channels that appear under-leveraged or over-saturated.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultAttribution(modelType);
      }
    } else {
      result = getDefaultAttribution(modelType);
    }

    const attribution = await prisma.aIAttribution.create({
      data: {
        userId: req.userId!,
        name: result.name,
        modelType: result.modelType,
        channels: JSON.stringify(result.channels),
        insights: JSON.stringify(result.insights),
        revenue: result.totalRevenue || 0,
        conversions: result.totalConversions || 0,
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'ATTRIBUTION_MODEL',
        prompt: JSON.stringify({ modelType, channels, timeframe }),
        result: JSON.stringify(result),
      },
    });

    res.json({ ...attribution, parsedChannels: result.channels, parsedInsights: result.insights, recommendations: result.recommendations });
  } catch (error) {
    console.error('AI attribution analyze error:', error);
    res.status(500).json({ error: 'Failed to analyze attribution' });
  }
});

router.delete('/attributions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIAttribution.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete attribution' });
  }
});

// ============= AI BUDGET ALLOCATOR =============
router.get('/budgets', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const budgets = await prisma.aIBudget.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budgets' });
  }
});

router.get('/budgets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const budget = await prisma.aIBudget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

router.post('/budgets/allocate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { totalBudget, channels, goals, timeframe } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a fractional CMO and marketing budget strategist who has managed $1M+ marketing budgets. You optimize spend allocation using marginal ROI analysis, channel saturation curves, and portfolio theory applied to marketing.

Your budget allocation methodology:
- Allocate based on expected ROI per channel, accounting for diminishing returns at higher spend levels
- Ensure allocation percentages sum to exactly 100% and dollar amounts sum to the total budget
- Prioritize channels with highest expected ROI but maintain diversification to reduce risk
- Factor in channel maturity: new channels need testing budgets, proven channels get scale budgets
- Consider the full funnel: allocate across awareness (top), consideration (mid), and conversion (bottom) channels
- Include a 5-10% testing/experimentation budget for emerging channels or new tactics
- Provide realistic ROI expectations based on industry benchmarks (not inflated numbers)
- Assess risk level based on channel diversity and historical performance data

Return ONLY this exact JSON structure:
{
  "name": "Budget Allocation Plan",
  "totalBudget": 10000,
  "allocations": [
    {"channel": "Channel Name", "amount": 2000, "percentage": 20, "expectedROI": 4.5, "priority": "high"}
  ],
  "recommendations": ["specific optimization recommendation 1", "risk mitigation strategy 2", "testing suggestion 3"],
  "projectedROI": 3.5,
  "projectedRevenue": 35000,
  "riskLevel": "moderate"
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Create an optimized marketing budget allocation plan:

TOTAL BUDGET: $${totalBudget || 10000}
AVAILABLE CHANNELS: ${channels?.join(', ') || 'Email, Social, Content, PPC'}
BUSINESS GOALS: ${goals || 'Maximize ROI while maintaining brand awareness'}
TIMEFRAME: ${timeframe || 'Monthly'}

Distribute the budget strategically across channels to maximize overall ROI. Provide realistic expected returns for each channel, prioritize high-ROI channels while maintaining diversification, and include specific recommendations for optimizing spend efficiency.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultBudgetAllocation(totalBudget);
      }
    } else {
      result = getDefaultBudgetAllocation(totalBudget);
    }

    const budget = await prisma.aIBudget.create({
      data: {
        userId: req.userId!,
        name: result.name,
        totalBudget: result.totalBudget || totalBudget || 10000,
        allocations: JSON.stringify(result.allocations),
        recommendations: JSON.stringify(result.recommendations),
        projectedROI: result.projectedROI || 0,
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'BUDGET_ALLOCATOR',
        prompt: JSON.stringify({ totalBudget, channels, goals }),
        result: JSON.stringify(result),
      },
    });

    res.json({ ...budget, parsedAllocations: result.allocations, parsedRecommendations: result.recommendations, projectedRevenue: result.projectedRevenue, riskLevel: result.riskLevel });
  } catch (error) {
    console.error('AI budget allocate error:', error);
    res.status(500).json({ error: 'Failed to allocate budget' });
  }
});

router.delete('/budgets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIBudget.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// ============= AI FATIGUE DETECTOR =============
router.get('/fatigues', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const fatigues = await prisma.aIFatigue.findMany({
      where: { userId: req.userId },
      orderBy: { detectedAt: 'desc' },
    });
    res.json(fatigues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fatigue data' });
  }
});

router.get('/fatigues/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const fatigue = await prisma.aIFatigue.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!fatigue) return res.status(404).json({ error: 'Fatigue record not found' });
    res.json(fatigue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fatigue record' });
  }
});

router.post('/fatigues/detect', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { segmentId, timeframe } = req.body;

    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: { campaignRecipients: true },
    });

    let results: any[] = [];

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a senior email marketing fatigue analyst with deep expertise in subscriber engagement psychology, email deliverability, and retention optimization. You specialize in identifying early warning signs of audience fatigue before they lead to unsubscribes, spam complaints, or list degradation.

Your fatigue detection methodology includes:
- **Engagement Decay Analysis**: Tracking open rate, click rate, and conversion rate trends over rolling windows (7-day, 14-day, 30-day) to identify declining engagement patterns
- **Frequency Overload Detection**: Comparing send frequency against industry benchmarks and individual subscriber tolerance thresholds
- **Content Saturation Scoring**: Measuring how repetitive messaging topics and formats contribute to disengagement
- **Behavioral Signal Mapping**: Analyzing passive signals like email deletion without opening, time-to-open increases, and mobile vs desktop shifts
- **Churn Prediction Modeling**: Estimating probability of unsubscribe based on engagement trajectory and historical patterns
- **Segment-Level Risk Assessment**: Identifying which audience segments are most vulnerable to fatigue based on lifecycle stage, acquisition source, and engagement history

For each fatigue segment identified, provide:
- A descriptive segment name reflecting the fatigue pattern
- A fatigue score (0-100, where 100 = extreme fatigue risk)
- Current email frequency and recommended frequency
- Quantified open rate decline percentage
- Risk level classification (low/medium/high/critical) with clear thresholds
- At least 4 specific, actionable recommendations tailored to the segment
- Estimated number of affected contacts
- Projected impact if no action is taken (e.g., expected unsubscribe rate increase)

Return ONLY this exact JSON structure (array with 4-6 distinct fatigue segments):
[
  {
    "segmentName": "High-frequency contacts",
    "fatigueScore": 78,
    "emailFrequency": 12,
    "openRateDecline": -15,
    "riskLevel": "high",
    "recommendations": ["Reduce frequency to 2 emails/week", "Add more personalization", "Implement preference center", "A/B test send times"],
    "affectedContacts": 150
  }
]

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Perform a comprehensive email fatigue detection analysis for the following audience:

**Audience Overview:**
- Total contacts in database: ${contacts.length}
- Analysis timeframe: ${timeframe || 'Last 30 days'}
- Target segment: ${segmentId || 'All contacts (full database analysis)'}

**Analysis Requirements:**
1. Identify 4-6 distinct fatigue risk segments within this audience
2. For each segment, calculate fatigue scores based on engagement decay patterns
3. Provide frequency-specific recommendations (not just generic advice)
4. Include both immediate tactical fixes and long-term strategic changes
5. Consider seasonal factors and industry email benchmarks
6. Flag any segments at critical risk of mass unsubscription

Please return detailed fatigue analysis with actionable remediation strategies for each identified segment.`,
          },
        ], 4000);

        results = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        results = getDefaultFatigueDetection(contacts.length);
      }
    } else {
      results = getDefaultFatigueDetection(contacts.length);
    }

    const fatigueRecords = [];
    for (const r of results) {
      const fatigue = await prisma.aIFatigue.create({
        data: {
          userId: req.userId!,
          segmentName: r.segmentName,
          fatigueScore: r.fatigueScore,
          emailFrequency: r.emailFrequency,
          openRateDecline: r.openRateDecline,
          recommendations: JSON.stringify(r.recommendations),
        },
      });
      fatigueRecords.push({ ...fatigue, riskLevel: r.riskLevel, affectedContacts: r.affectedContacts, parsedRecommendations: r.recommendations });
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'FATIGUE_DETECTOR',
        prompt: JSON.stringify({ segmentId, timeframe }),
        result: JSON.stringify(results),
      },
    });

    res.json(fatigueRecords);
  } catch (error) {
    console.error('AI fatigue detect error:', error);
    res.status(500).json({ error: 'Failed to detect fatigue' });
  }
});

router.delete('/fatigues/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIFatigue.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete fatigue record' });
  }
});

// ============= AI CUSTOMER PERSONA CREATOR =============
router.get('/personas', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const personas = await prisma.aIPersona.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get personas' });
  }
});

router.get('/personas/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const persona = await prisma.aIPersona.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get persona' });
  }
});

router.post('/personas/create', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { industry, targetMarket, productType } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a senior customer research strategist and buyer persona specialist with extensive experience in market segmentation, consumer psychology, and data-driven persona development. You've built personas for Fortune 500 companies and high-growth startups across B2B and B2C markets.

Your persona creation methodology draws from:
- **Jobs-to-Be-Done Framework**: Understanding the functional, emotional, and social jobs customers are trying to accomplish
- **Empathy Mapping**: Deep understanding of what the persona thinks, feels, sees, hears, says, and does in their professional and personal contexts
- **Behavioral Economics**: Applying cognitive biases, decision heuristics, and motivational psychology to predict buying behavior
- **Customer Journey Analysis**: Mapping awareness, consideration, decision, and advocacy stages specific to this persona
- **Technographic & Firmographic Profiling**: Understanding technology adoption patterns and organizational characteristics
- **Value Proposition Alignment**: Connecting persona pain points directly to product/service value propositions

Create a richly detailed, data-informed persona. Use the EXACT JSON schema below — no extra fields, no nested objects beyond what's shown. Keep string values concise (1-2 sentences max).

Return ONLY this exact JSON structure:
{
  "name": "Alliterative Persona Name",
  "avatar": "descriptor-keywords",
  "demographics": {
    "age": "age range",
    "gender": "gender",
    "income": "income range",
    "education": "education level",
    "location": "location type",
    "occupation": "job title"
  },
  "psychographics": {
    "values": ["value1", "value2", "value3", "value4", "value5"],
    "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"],
    "lifestyle": "one sentence lifestyle description"
  },
  "behaviors": {
    "buyingHabits": "one sentence buying habits",
    "brandInteractions": "one sentence brand interactions",
    "decisionProcess": "one sentence decision process"
  },
  "painPoints": ["pain point 1", "pain point 2", "pain point 3", "pain point 4", "pain point 5"],
  "goals": ["goal 1", "goal 2", "goal 3", "goal 4", "goal 5"],
  "preferredChannels": ["channel 1", "channel 2", "channel 3", "channel 4"],
  "contentPreferences": ["format 1", "format 2", "format 3", "format 4"],
  "messagingTips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly.`,
          },
          {
            role: 'user',
            content: `Create a comprehensive, deeply researched customer persona for the following business context:

**Business Context:**
- Industry: ${industry || 'Technology'}
- Target Market: ${targetMarket || 'B2B'}
- Product/Service Type: ${productType || 'SaaS'}

**Persona Requirements:**
1. Create a realistic, three-dimensional persona that feels like a real person (not a generic archetype)
2. Include specific demographic details with realistic ranges for the industry
3. Develop deep psychographic insights that reveal motivations, fears, and aspirations
4. Map detailed buying behaviors including research sources, decision criteria, and typical buying timeline
5. Identify at least 5 pain points with emotional context and business impact
6. Define at least 5 goals with measurable success indicators
7. Rank preferred communication channels with usage frequency
8. Specify content preferences with format and consumption patterns
9. Provide at least 5 messaging tips with example phrases and emotional triggers to use
10. Consider the persona's day-to-day challenges, information sources, and professional network

Make this persona actionable for marketing, sales, and product teams.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultPersona(industry);
      }
    } else {
      result = getDefaultPersona(industry);
    }

    const persona = await prisma.aIPersona.create({
      data: {
        userId: req.userId!,
        name: result.name,
        avatar: result.avatar,
        demographics: JSON.stringify(result.demographics),
        psychographics: JSON.stringify(result.psychographics),
        behaviors: JSON.stringify(result.behaviors),
        painPoints: JSON.stringify(result.painPoints),
        goals: JSON.stringify(result.goals),
        preferredChannels: JSON.stringify(result.preferredChannels),
        contentPreferences: JSON.stringify(result.contentPreferences),
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'PERSONA_CREATOR',
        prompt: JSON.stringify({ industry, targetMarket, productType }),
        result: JSON.stringify(result),
      },
    });

    res.json({
      ...persona,
      parsedDemographics: result.demographics,
      parsedPsychographics: result.psychographics,
      parsedBehaviors: result.behaviors,
      parsedPainPoints: result.painPoints,
      parsedGoals: result.goals,
      parsedPreferredChannels: result.preferredChannels,
      parsedContentPreferences: result.contentPreferences,
      messagingTips: result.messagingTips,
    });
  } catch (error) {
    console.error('AI persona create error:', error);
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

router.put('/personas/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, status } = req.body;
    const persona = await prisma.aIPersona.update({
      where: { id: req.params.id },
      data: { name, status },
    });
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

router.delete('/personas/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIPersona.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

// ============= AI INFLUENCER MATCHER =============
router.get('/influencers', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const influencers = await prisma.aIInfluencer.findMany({
      where: { userId: req.userId },
      orderBy: { matchScore: 'desc' },
    });
    res.json(influencers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get influencers' });
  }
});

router.get('/influencers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const influencer = await prisma.aIInfluencer.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!influencer) return res.status(404).json({ error: 'Influencer not found' });
    res.json(influencer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get influencer' });
  }
});

router.post('/influencers/match', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { niche, platform, budget, targetAudience } = req.body;

    let results: any[] = [];

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a senior influencer marketing strategist with deep expertise in creator economy analytics, brand-creator partnerships, and ROI-driven influencer campaigns. You've managed influencer programs with budgets from $5K to $500K+ across all major social platforms.

Your influencer matching methodology includes:
- **Audience Alignment Scoring**: Analyzing demographic overlap between influencer audience and brand target market using follower composition data
- **Engagement Quality Assessment**: Going beyond vanity metrics to evaluate comment sentiment, save rates, share rates, and meaningful interaction patterns
- **Content-Brand Fit Analysis**: Evaluating visual aesthetics, tone of voice, content themes, and brand safety considerations
- **Performance Prediction Modeling**: Estimating expected reach, impressions, clicks, and conversions based on historical performance data and platform algorithms
- **Cost-Efficiency Optimization**: Calculating CPM, CPE (cost per engagement), and projected ROAS for each influencer match
- **Tier Stratification**: Categorizing influencers across nano (1K-10K), micro (10K-100K), mid-tier (100K-500K), and macro (500K+) tiers with strategic recommendations for each
- **Risk Assessment**: Evaluating influencer reputation, controversy history, audience authenticity (fake follower detection), and content consistency

For each influencer match, provide:
- A realistic influencer profile name that fits the niche
- Platform-specific follower count and engagement metrics
- A match score (0-100) based on multi-factor alignment analysis
- Estimated reach and cost with confidence ranges
- At least 3 pros and 2 cons for honest evaluation
- Specific collaboration format recommendations (stories, reels, posts, long-form, etc.)
- Expected deliverables and timeline

Return ONLY this exact JSON structure (array with 4-6 influencer matches across different tiers):
[
  {
    "name": "Influencer Name",
    "platform": "Instagram",
    "niche": "Marketing",
    "followers": 50000,
    "engagementRate": 4.5,
    "matchScore": 92,
    "estimatedReach": 25000,
    "estimatedCost": 500,
    "pros": ["High engagement", "Authentic content", "Strong niche authority"],
    "cons": ["Limited B2B experience", "Inconsistent posting schedule"],
    "recommendedCollaboration": "Sponsored post series with Stories integration"
  }
]

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Find and match the best influencers for the following campaign:

**Campaign Brief:**
- Niche/Industry: ${niche || 'Marketing'}
- Primary Platform: ${platform || 'Instagram'}
- Total Budget: $${budget || 5000}
- Target Audience: ${targetAudience || 'Professionals aged 25-45'}

**Matching Requirements:**
1. Provide 4-6 influencer matches spanning different follower tiers (at least one micro and one mid-tier)
2. Calculate match scores based on audience alignment, engagement quality, and content fit
3. Ensure total estimated costs fit within the specified budget
4. Include both established creators and rising talent for budget optimization
5. Evaluate each influencer honestly with specific pros and cons
6. Recommend specific collaboration formats optimized for the platform's algorithm
7. Consider content authenticity, brand safety, and audience quality in scoring
8. Prioritize influencers with proven track records in the specified niche

Provide a diverse set of matches that gives the brand strategic options for different campaign approaches.`,
          },
        ], 4000);

        results = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        results = getDefaultInfluencerMatches(niche, platform);
      }
    } else {
      results = getDefaultInfluencerMatches(niche, platform);
    }

    const influencers = [];
    for (const r of results) {
      const influencer = await prisma.aIInfluencer.create({
        data: {
          userId: req.userId!,
          name: r.name,
          platform: r.platform,
          niche: r.niche,
          followers: r.followers,
          engagementRate: r.engagementRate,
          matchScore: r.matchScore,
          estimatedReach: r.estimatedReach,
          estimatedCost: r.estimatedCost,
          notes: r.recommendedCollaboration,
        },
      });
      influencers.push({ ...influencer, pros: r.pros, cons: r.cons, recommendedCollaboration: r.recommendedCollaboration });
    }

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'INFLUENCER_MATCHER',
        prompt: JSON.stringify({ niche, platform, budget, targetAudience }),
        result: JSON.stringify(results),
      },
    });

    res.json(influencers);
  } catch (error) {
    console.error('AI influencer match error:', error);
    res.status(500).json({ error: 'Failed to match influencers' });
  }
});

router.put('/influencers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { status, notes } = req.body;
    const influencer = await prisma.aIInfluencer.update({
      where: { id: req.params.id },
      data: { status, notes },
    });
    res.json(influencer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update influencer' });
  }
});

router.delete('/influencers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIInfluencer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete influencer' });
  }
});

// ============= AI HASHTAG GENERATOR =============
router.get('/hashtags', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const hashtags = await prisma.aIHashtag.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(hashtags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hashtags' });
  }
});

router.get('/hashtags/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const hashtag = await prisma.aIHashtag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!hashtag) return res.status(404).json({ error: 'Hashtag record not found' });
    res.json(hashtag);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hashtag record' });
  }
});

router.post('/hashtags/generate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { topic, platform, count = 20 } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a senior social media strategist and hashtag research specialist with deep expertise in platform algorithms, content discovery mechanics, and social media SEO. You've optimized hashtag strategies for brands achieving millions of impressions through strategic hashtag placement.

Your hashtag generation methodology includes:
- **Popularity-Competition Matrix**: Categorizing hashtags by search volume vs. competition density to find optimal discoverability windows
- **Platform Algorithm Awareness**: Understanding how Instagram Explore, TikTok FYP, Twitter Trending, and LinkedIn feed algorithms weight hashtag signals differently
- **Tiered Hashtag Strategy**: Combining high-volume (1M+ posts), medium-volume (100K-1M), niche (10K-100K), and branded/custom tags for maximum reach
- **Semantic Clustering**: Grouping related hashtags that reinforce topical authority and help algorithms understand content context
- **Trend Analysis**: Identifying rising hashtags with growing momentum vs. declining ones losing relevance
- **Competitor Intelligence**: Analyzing what top-performing competitors use and identifying gaps
- **Audience Search Behavior**: Understanding what hashtags your target audience actively follows and searches for

For each hashtag, provide:
- The hashtag with # prefix
- Popularity level (low/medium/high/trending) based on post volume
- Competition level (low/medium/high) based on content saturation
- Whether it's recommended for this specific context
- Category classification (broad, niche, branded, community, trending, location)

Also include:
- An overall hashtag strategy explanation tailored to the platform
- At least 4 platform-specific recommendations
- At least 4 best practices for hashtag usage on the target platform
- Suggested hashtag groupings for different post types

Return ONLY this exact JSON structure:
{
  "topic": "Topic Name",
  "platform": "Instagram",
  "hashtags": [
    {"tag": "#marketing", "popularity": "high", "competition": "high", "recommended": true, "category": "broad"},
    {"tag": "#digitalmarketing", "popularity": "high", "competition": "medium", "recommended": true, "category": "niche"}
  ],
  "strategy": "Mix of high-popularity and niche hashtags for optimal discoverability",
  "recommendations": ["Use 5-10 hashtags per post", "Mix popular and niche hashtags", "Rotate hashtag sets", "Track performance weekly"],
  "bestPractices": ["Place in first comment for cleaner look", "Research competitor hashtags", "Avoid banned hashtags", "Update strategy monthly"]
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Generate a comprehensive, strategically optimized hashtag set for the following:

**Content Context:**
- Topic/Theme: ${topic || 'Marketing'}
- Target Platform: ${platform || 'Instagram'}
- Requested Count: ${count} hashtags

**Generation Requirements:**
1. Generate exactly ${count} hashtags using the tiered strategy (mix of broad, niche, and trending)
2. Include at least 30% niche/low-competition hashtags for discoverability
3. Include 2-3 trending or emerging hashtags with growing momentum
4. Avoid oversaturated hashtags where content gets buried instantly
5. Ensure hashtags are relevant to the topic and won't trigger platform penalties
6. Group hashtags by category for easy mix-and-match usage
7. Provide platform-specific posting strategy (placement, timing, rotation)
8. Include best practices specific to ${platform || 'Instagram'}'s current algorithm
9. Consider seasonal relevance and current trends in the topic area

Deliver a hashtag strategy that maximizes both reach and engagement for content about ${topic || 'Marketing'}.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultHashtags(topic, platform);
      }
    } else {
      result = getDefaultHashtags(topic, platform);
    }

    const hashtagRecord = await prisma.aIHashtag.create({
      data: {
        userId: req.userId!,
        topic: result.topic || topic,
        platform: result.platform || platform,
        hashtags: JSON.stringify(result.hashtags),
        popularity: JSON.stringify(result.hashtags.map((h: any) => ({ tag: h.tag, level: h.popularity }))),
        recommendations: JSON.stringify(result.recommendations),
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'HASHTAG_GENERATOR',
        prompt: JSON.stringify({ topic, platform, count }),
        result: JSON.stringify(result),
      },
    });

    res.json({
      ...hashtagRecord,
      parsedHashtags: result.hashtags,
      strategy: result.strategy,
      parsedRecommendations: result.recommendations,
      bestPractices: result.bestPractices,
    });
  } catch (error) {
    console.error('AI hashtag generate error:', error);
    res.status(500).json({ error: 'Failed to generate hashtags' });
  }
});

router.delete('/hashtags/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIHashtag.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hashtag record' });
  }
});

// ============= AI LANDING PAGE BUILDER =============
router.get('/landing-pages', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const pages = await prisma.aILandingPageTemplate.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get landing pages' });
  }
});

router.get('/landing-pages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const page = await prisma.aILandingPageTemplate.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!page) return res.status(404).json({ error: 'Landing page not found' });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get landing page' });
  }
});

router.post('/landing-pages/generate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { purpose, industry, targetAudience, productName } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a senior conversion rate optimization (CRO) specialist and landing page architect with extensive experience building high-converting pages for SaaS, e-commerce, lead generation, and service businesses. You combine direct response copywriting expertise with modern UX/UI best practices to create landing pages that consistently outperform industry benchmarks.

Your landing page creation methodology draws from:
- **AIDA Framework**: Structuring content flow through Attention (headline), Interest (subheadline/intro), Desire (benefits/features), Action (CTA) for maximum conversion
- **Value Proposition Canvas**: Ensuring the headline and copy directly address the visitor's jobs-to-be-done, pains, and gains
- **Cognitive Load Theory**: Minimizing decision fatigue through clear visual hierarchy, progressive disclosure, and focused messaging
- **Social Proof Psychology**: Strategically placing testimonials, trust badges, statistics, and case study snippets to build credibility at decision points
- **Conversion-Centered Design Principles**: Applying encapsulation, contrast, directional cues, white space, and urgency/scarcity triggers
- **Mobile-First Optimization**: Ensuring all content elements work effectively on mobile devices where 60%+ of traffic originates
- **A/B Testing Intelligence**: Drawing from conversion testing data to inform headline structures, CTA placement, form length, and layout choices

Create a complete landing page with:
- A headline that passes the 5-second clarity test (visitor immediately understands the offer)
- A subheadline that reinforces the value proposition with specificity
- Body copy that leads with benefits, supports with features, and overcomes objections
- A compelling, action-oriented CTA with urgency or value reinforcement
- At least 4 feature/benefit sections with benefit-driven titles
- A realistic testimonial with emotional impact
- A conversion-optimized color scheme based on color psychology
- A proven layout structure with section-by-section rationale
- At least 4 conversion optimization tips specific to this page type
- SEO-optimized meta tags for organic discoverability

Return ONLY this exact JSON structure:
{
  "name": "Landing Page Name",
  "purpose": "Lead Generation",
  "headline": "Compelling Headline Here",
  "subheadline": "Supporting subheadline that explains the value",
  "bodyCopy": "Detailed body copy that explains benefits and features...",
  "ctaText": "Get Started Free",
  "ctaColor": "#4F46E5",
  "features": [
    {"title": "Feature 1", "description": "Feature description"},
    {"title": "Feature 2", "description": "Feature description"}
  ],
  "testimonial": {"quote": "Amazing product!", "author": "John D.", "company": "Tech Corp"},
  "colorScheme": {"primary": "#4F46E5", "secondary": "#10B981", "background": "#F9FAFB"},
  "layout": "hero-features-testimonial-cta",
  "conversionTips": ["Add urgency", "Include social proof", "Minimize form fields", "Use directional cues"],
  "seoSuggestions": {"title": "SEO Title", "description": "Meta description"}
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise (1-2 sentences max per value).`,
          },
          {
            role: 'user',
            content: `Generate a high-converting landing page for the following business:

**Business Context:**
- Page Purpose: ${purpose || 'Lead Generation'}
- Industry: ${industry || 'Technology'}
- Target Audience: ${targetAudience || 'Small businesses'}
- Product/Service Name: ${productName || 'SaaS Product'}

**Landing Page Requirements:**
1. Create a headline that immediately communicates the core value proposition (use power words, specificity, and clarity)
2. Write a subheadline that addresses the primary pain point and hints at the solution
3. Develop body copy that follows the Problem-Agitation-Solution (PAS) framework
4. Design a CTA that creates urgency and clearly states what the visitor gets
5. Include at least 4 feature sections that lead with benefits (not just features)
6. Create a realistic, emotionally compelling testimonial relevant to the industry
7. Choose a color scheme based on conversion psychology for the target audience
8. Recommend a layout structure optimized for the page purpose (${purpose || 'Lead Generation'})
9. Provide at least 4 specific conversion optimization tips for this type of page
10. Include SEO title and meta description optimized for search intent

Make this landing page persuasive, trustworthy, and optimized for maximum conversion.`,
          },
        ], 4000);

        result = repairJSON(aiResponse);
      } catch (aiErr: any) {
          console.error('[AI] callOpenRouter or parse failed:', aiErr?.message || aiErr);
        result = getDefaultLandingPage(purpose, productName);
      }
    } else {
      result = getDefaultLandingPage(purpose, productName);
    }

    const landingPage = await prisma.aILandingPageTemplate.create({
      data: {
        userId: req.userId!,
        name: result.name,
        purpose: result.purpose,
        industry: industry,
        headline: result.headline,
        subheadline: result.subheadline,
        bodyCopy: result.bodyCopy,
        ctaText: result.ctaText,
        ctaColor: result.ctaColor,
        layout: JSON.stringify(result.layout),
        colorScheme: JSON.stringify(result.colorScheme),
        conversionTips: JSON.stringify(result.conversionTips),
      },
    });

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'LANDING_PAGE_BUILDER',
        prompt: JSON.stringify({ purpose, industry, targetAudience, productName }),
        result: JSON.stringify(result),
      },
    });

    res.json({
      ...landingPage,
      features: result.features,
      testimonial: result.testimonial,
      parsedColorScheme: result.colorScheme,
      parsedLayout: result.layout,
      parsedConversionTips: result.conversionTips,
      seoSuggestions: result.seoSuggestions,
    });
  } catch (error) {
    console.error('AI landing page generate error:', error);
    res.status(500).json({ error: 'Failed to generate landing page' });
  }
});

router.put('/landing-pages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, headline, subheadline, bodyCopy, ctaText, status } = req.body;
    const page = await prisma.aILandingPageTemplate.update({
      where: { id: req.params.id },
      data: { name, headline, subheadline, bodyCopy, ctaText, status },
    });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update landing page' });
  }
});

router.delete('/landing-pages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aILandingPageTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete landing page' });
  }
});

// ============= AI EMAIL CAMPAIGN WRITER =============
router.post('/email-campaigns/generate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { campaignType, industry, audience, tone, productName, goal, keyMessages } = req.body;

    let result: any;

    if (isAIAvailable()) {
      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: `You are a world-class email marketing strategist and copywriter who has crafted award-winning email campaigns for Fortune 500 companies, achieving open rates 2-3x above industry averages and driving millions in revenue.

Your email campaign expertise includes:
- Crafting irresistible subject lines that drive opens (30-50 char sweet spot)
- Writing preview text that complements the subject and boosts open rates
- Structuring emails with scannable layouts, compelling headlines, and clear CTAs
- Using psychological triggers: urgency, social proof, exclusivity, curiosity, FOMO
- Personalizing content for specific audience segments
- A/B testing strategies for continuous optimization
- Mobile-first design principles (65%+ of emails opened on mobile)

Create a complete, professional email campaign ready to send.

Return ONLY this exact JSON structure:
{
  "name": "Campaign Name",
  "subject": "Compelling subject line (30-50 chars)",
  "previewText": "Preview text that complements the subject (40-90 chars)",
  "sections": [
    {
      "type": "header",
      "heading": "Main headline",
      "subheading": "Supporting subheading"
    },
    {
      "type": "body",
      "heading": "Section heading",
      "content": "Section body text with compelling copy"
    },
    {
      "type": "feature",
      "heading": "Feature/benefit heading",
      "items": ["Benefit 1", "Benefit 2", "Benefit 3"]
    },
    {
      "type": "testimonial",
      "quote": "Customer testimonial text",
      "author": "Customer Name",
      "role": "Job Title, Company"
    },
    {
      "type": "cta",
      "heading": "CTA section heading",
      "buttonText": "CTA button text",
      "urgency": "Urgency/scarcity text below CTA"
    }
  ],
  "ctaText": "Primary CTA button text",
  "ctaColor": "#4F46E5",
  "estimatedOpenRate": 28.5,
  "estimatedClickRate": 4.2,
  "abVariants": [
    {"subject": "Variant A subject", "angle": "Curiosity-driven"},
    {"subject": "Variant B subject", "angle": "Benefit-focused"},
    {"subject": "Variant C subject", "angle": "Urgency-based"}
  ],
  "sendTimeRec": "Tuesday 10:00 AM EST",
  "tips": [
    "Optimization tip 1",
    "Optimization tip 2",
    "Optimization tip 3",
    "Optimization tip 4",
    "Optimization tip 5"
  ]
}

CRITICAL: Do NOT add any fields not shown above. Follow this schema exactly. Keep string values concise. Generate 4-5 sections with diverse types.`,
          },
          {
            role: 'user',
            content: `Create a complete, high-converting email campaign with these specifications:

CAMPAIGN DETAILS:
- Type: ${campaignType || 'promotional'}
- Industry: ${industry || 'General'}
- Target Audience: ${audience || 'General subscribers'}
- Tone: ${tone || 'professional'}
- Product/Service: ${productName || 'Not specified'}
- Campaign Goal: ${goal || 'Drive engagement and conversions'}
- Key Messages: ${keyMessages || 'Not specified'}

Generate a complete email campaign with compelling copy, multiple content sections, A/B test variants for the subject line, and actionable optimization tips. Make the copy persuasive, scannable, and mobile-friendly.`,
          },
        ], 4096);

        try {
          result = repairJSON(aiResponse);
        } catch (parseErr: any) {
          console.error('[AI] Email campaign JSON parse failed:', parseErr?.message);
          result = getDefaultEmailCampaign(campaignType, industry, audience);
        }
      } catch (error) {
        console.error('[AI] Email campaign generation error:', error);
        result = getDefaultEmailCampaign(campaignType, industry, audience);
      }
    } else {
      result = getDefaultEmailCampaign(campaignType, industry, audience);
    }

    // Save to database
    const saved = await prisma.aIEmailCampaign.create({
      data: {
        userId: req.userId!,
        name: result.name || 'Email Campaign',
        campaignType: campaignType || 'promotional',
        subject: result.subject || 'Your Email Subject',
        previewText: result.previewText || '',
        body: JSON.stringify(result.sections || []),
        sections: JSON.stringify(result.sections || []),
        ctaText: result.ctaText || 'Learn More',
        tone: tone || 'professional',
        industry: industry || '',
        audience: audience || '',
        estimatedOpenRate: result.estimatedOpenRate || 0,
        estimatedClickRate: result.estimatedClickRate || 0,
        abVariants: JSON.stringify(result.abVariants || []),
        sendTimeRec: result.sendTimeRec || '',
        tips: JSON.stringify(result.tips || []),
      },
    });

    // Parse JSON fields for response
    const response = {
      ...saved,
      parsedSections: result.sections || [],
      parsedAbVariants: result.abVariants || [],
      parsedTips: result.tips || [],
      ctaColor: result.ctaColor || '#4F46E5',
    };

    await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: 'EMAIL_CAMPAIGN_WRITER',
        prompt: JSON.stringify({ campaignType, industry, audience, tone, productName, goal }),
        result: JSON.stringify(result),
      },
    });

    res.json(response);
  } catch (error) {
    console.error('AI email campaign generation error:', error);
    res.status(500).json({ error: 'Failed to generate email campaign' });
  }
});

// Get all AI email campaigns
router.get('/email-campaigns', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const campaigns = await prisma.aIEmailCampaign.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = campaigns.map(c => ({
      ...c,
      parsedSections: (() => { try { return JSON.parse(c.sections || '[]'); } catch { return []; } })(),
      parsedAbVariants: (() => { try { return JSON.parse(c.abVariants || '[]'); } catch { return []; } })(),
      parsedTips: (() => { try { return JSON.parse(c.tips || '[]'); } catch { return []; } })(),
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch email campaigns' });
  }
});

// Get single AI email campaign
router.get('/email-campaigns/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const campaign = await prisma.aIEmailCampaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    res.json({
      ...campaign,
      parsedSections: (() => { try { return JSON.parse(campaign.sections || '[]'); } catch { return []; } })(),
      parsedAbVariants: (() => { try { return JSON.parse(campaign.abVariants || '[]'); } catch { return []; } })(),
      parsedTips: (() => { try { return JSON.parse(campaign.tips || '[]'); } catch { return []; } })(),
    });
  } catch (error) {
    console.error('Get email campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch email campaign' });
  }
});

// Update AI email campaign
router.put('/email-campaigns/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const existing = await prisma.aIEmailCampaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.aIEmailCampaign.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name ?? existing.name,
        subject: req.body.subject ?? existing.subject,
        previewText: req.body.previewText ?? existing.previewText,
        ctaText: req.body.ctaText ?? existing.ctaText,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update email campaign error:', error);
    res.status(500).json({ error: 'Failed to update email campaign' });
  }
});

// Delete AI email campaign
router.delete('/email-campaigns/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const existing = await prisma.aIEmailCampaign.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await prisma.aIEmailCampaign.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete email campaign error:', error);
    res.status(500).json({ error: 'Failed to delete email campaign' });
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

function getDefaultSegmentBuild(goal: string, totalContacts: number): any {
  return {
    name: `AI Segment - ${goal || 'Engagement'}`,
    description: `Smart segment based on ${goal || 'engagement'} criteria`,
    criteria: [
      { field: 'engagement', operator: 'gt', value: '50' },
      { field: 'lastActive', operator: 'lt', value: '30days' },
    ],
    estimatedSize: Math.floor(totalContacts * 0.3),
    confidence: 78,
    insights: [
      'High engagement correlates with recent activity',
      'Email opens peak on Tuesday mornings',
      'This segment shows 2x higher conversion potential',
    ],
    recommendations: [
      'Send personalized content to increase engagement',
      'Consider A/B testing subject lines for this group',
    ],
  };
}

function getDefaultJourneyOptimization(journeyType: string): any {
  return {
    name: `Optimized ${journeyType || 'Customer'} Journey`,
    description: 'AI-optimized customer journey with improved touchpoints',
    stages: [
      { name: 'Awareness', order: 1, channels: ['social', 'content', 'ads'], actions: ['View content', 'See ad'], duration: '1-2 weeks' },
      { name: 'Consideration', order: 2, channels: ['email', 'retargeting', 'webinars'], actions: ['Download resource', 'Attend webinar'], duration: '2-3 weeks' },
      { name: 'Decision', order: 3, channels: ['email', 'sales', 'demo'], actions: ['Request demo', 'Talk to sales'], duration: '1-2 weeks' },
      { name: 'Purchase', order: 4, channels: ['website', 'sales'], actions: ['Complete purchase', 'Sign contract'], duration: '1 week' },
      { name: 'Retention', order: 5, channels: ['email', 'support', 'community'], actions: ['Onboarding', 'Support'], duration: 'Ongoing' },
    ],
    touchpoints: [
      { channel: 'email', timing: 'Day 1', content: 'Welcome email' },
      { channel: 'email', timing: 'Day 3', content: 'Educational content' },
      { channel: 'retargeting', timing: 'Day 5', content: 'Product benefits ad' },
      { channel: 'email', timing: 'Day 7', content: 'Case study' },
    ],
    recommendations: [
      'Add more personalization at the consideration stage',
      'Reduce friction in the decision stage with clearer CTAs',
      'Implement abandoned cart emails for better conversion',
    ],
    conversionRate: 15.5,
    improvements: ['Shorter time to conversion', 'Higher engagement rates', 'Better lead qualification'],
  };
}

function getDefaultAttribution(modelType: string): any {
  return {
    name: `Attribution Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    modelType: modelType || 'data-driven',
    channels: [
      { name: 'Email Marketing', attribution: 32, conversions: 128, revenue: 12800 },
      { name: 'Social Media', attribution: 24, conversions: 96, revenue: 9600 },
      { name: 'Paid Search', attribution: 22, conversions: 88, revenue: 8800 },
      { name: 'Organic Search', attribution: 14, conversions: 56, revenue: 5600 },
      { name: 'Direct', attribution: 8, conversions: 32, revenue: 3200 },
    ],
    insights: [
      'Email marketing shows highest ROI across all channels',
      'Social media assists 40% of conversions attributed to other channels',
      'Paid search performs best for bottom-funnel conversions',
    ],
    recommendations: [
      'Increase email marketing budget by 15%',
      'Optimize social media for awareness campaigns',
      'Test new paid search keywords for higher intent',
    ],
    totalRevenue: 40000,
    totalConversions: 400,
  };
}

function getDefaultBudgetAllocation(totalBudget: number): any {
  const budget = totalBudget || 10000;
  return {
    name: `Budget Allocation - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    totalBudget: budget,
    allocations: [
      { channel: 'Email Marketing', amount: budget * 0.2, percentage: 20, expectedROI: 4.5, priority: 'high' },
      { channel: 'Social Media Ads', amount: budget * 0.25, percentage: 25, expectedROI: 3.2, priority: 'high' },
      { channel: 'Content Marketing', amount: budget * 0.2, percentage: 20, expectedROI: 3.8, priority: 'medium' },
      { channel: 'PPC / Search Ads', amount: budget * 0.2, percentage: 20, expectedROI: 2.8, priority: 'medium' },
      { channel: 'Influencer Marketing', amount: budget * 0.15, percentage: 15, expectedROI: 2.5, priority: 'low' },
    ],
    recommendations: [
      'Focus on email marketing for highest ROI',
      'Test new social ad formats for better engagement',
      'Allocate emergency fund for opportunistic campaigns',
    ],
    projectedROI: 3.4,
    projectedRevenue: budget * 3.4,
    riskLevel: 'moderate',
  };
}

function getDefaultFatigueDetection(totalContacts: number): any[] {
  return [
    {
      segmentName: 'High Frequency Recipients',
      fatigueScore: 72,
      emailFrequency: 8,
      openRateDecline: -18,
      riskLevel: 'high',
      recommendations: ['Reduce email frequency to 2x per week', 'Implement preference center'],
      affectedContacts: Math.floor(totalContacts * 0.15),
    },
    {
      segmentName: 'Declining Engagement',
      fatigueScore: 58,
      emailFrequency: 4,
      openRateDecline: -12,
      riskLevel: 'medium',
      recommendations: ['Send re-engagement campaign', 'Test different content types'],
      affectedContacts: Math.floor(totalContacts * 0.25),
    },
    {
      segmentName: 'At Risk of Unsubscribe',
      fatigueScore: 85,
      emailFrequency: 10,
      openRateDecline: -25,
      riskLevel: 'critical',
      recommendations: ['Pause campaigns for 2 weeks', 'Survey for preferences'],
      affectedContacts: Math.floor(totalContacts * 0.08),
    },
  ];
}

function getDefaultPersona(industry: string): any {
  return {
    name: 'Marketing Manager Mike',
    avatar: 'professional-male',
    demographics: {
      age: '30-45',
      gender: 'Male',
      income: '$60,000-$100,000',
      education: "Bachelor's degree",
      location: 'Urban/Suburban',
      occupation: 'Marketing Manager',
    },
    psychographics: {
      values: ['Efficiency', 'Results', 'Innovation'],
      interests: ['Digital marketing', 'Technology', 'Business growth'],
      lifestyle: 'Career-focused, tech-savvy professional',
    },
    behaviors: {
      buyingHabits: 'Research online, reads reviews and case studies',
      brandInteractions: 'Email and LinkedIn preferred',
      decisionProcess: 'Needs ROI justification, involves stakeholders',
    },
    painPoints: ['Limited budget', 'Proving marketing ROI', 'Keeping up with trends', 'Resource constraints'],
    goals: ['Increase lead generation', 'Improve campaign performance', 'Demonstrate value to leadership'],
    preferredChannels: ['Email', 'LinkedIn', 'Webinars', 'Industry blogs'],
    contentPreferences: ['Case studies', 'How-to guides', 'Industry reports', 'Video tutorials'],
    messagingTips: ['Focus on ROI and measurable results', 'Use data and statistics', 'Show time-saving benefits'],
  };
}

function getDefaultInfluencerMatches(niche: string, platform: string): any[] {
  return [
    {
      name: 'Sarah Marketing Pro',
      platform: platform || 'Instagram',
      niche: niche || 'Marketing',
      followers: 85000,
      engagementRate: 4.8,
      matchScore: 94,
      estimatedReach: 42000,
      estimatedCost: 800,
      pros: ['High engagement rate', 'Authentic content', 'Strong B2B audience'],
      cons: ['Limited availability', 'Higher price point'],
      recommendedCollaboration: 'Sponsored post series with stories',
    },
    {
      name: 'Digital Dan',
      platform: platform || 'Instagram',
      niche: niche || 'Marketing',
      followers: 52000,
      engagementRate: 5.2,
      matchScore: 88,
      estimatedReach: 28000,
      estimatedCost: 450,
      pros: ['Very engaged audience', 'Great storytelling', 'Reasonable pricing'],
      cons: ['Smaller reach', 'New to brand partnerships'],
      recommendedCollaboration: 'Product review and tutorial',
    },
    {
      name: 'Business Bella',
      platform: platform || 'Instagram',
      niche: niche || 'Marketing',
      followers: 120000,
      engagementRate: 3.5,
      matchScore: 82,
      estimatedReach: 55000,
      estimatedCost: 1200,
      pros: ['Large reach', 'Professional content', 'Cross-platform presence'],
      cons: ['Lower engagement', 'More commercial content'],
      recommendedCollaboration: 'Brand ambassador program',
    },
  ];
}

function getDefaultHashtags(topic: string, platform: string): any {
  const baseHashtags = [
    { tag: '#marketing', popularity: 'high', competition: 'high', recommended: true },
    { tag: '#digitalmarketing', popularity: 'high', competition: 'high', recommended: true },
    { tag: '#socialmedia', popularity: 'high', competition: 'medium', recommended: true },
    { tag: '#business', popularity: 'high', competition: 'high', recommended: false },
    { tag: '#entrepreneur', popularity: 'high', competition: 'high', recommended: true },
    { tag: '#marketingtips', popularity: 'medium', competition: 'medium', recommended: true },
    { tag: '#smallbusiness', popularity: 'high', competition: 'medium', recommended: true },
    { tag: '#growthhacking', popularity: 'medium', competition: 'low', recommended: true },
    { tag: '#contentmarketing', popularity: 'medium', competition: 'medium', recommended: true },
    { tag: '#marketingstrategy', popularity: 'medium', competition: 'low', recommended: true },
    { tag: '#branding', popularity: 'medium', competition: 'medium', recommended: true },
    { tag: '#onlinemarketing', popularity: 'medium', competition: 'medium', recommended: false },
    { tag: `#${(topic || 'marketing').toLowerCase().replace(/\s+/g, '')}`, popularity: 'niche', competition: 'low', recommended: true },
  ];

  return {
    topic: topic || 'Marketing',
    platform: platform || 'Instagram',
    hashtags: baseHashtags,
    strategy: 'Mix of high-reach and niche hashtags for optimal visibility',
    recommendations: [
      'Use 5-10 hashtags per post for optimal reach',
      'Mix popular hashtags with niche-specific ones',
      'Create a branded hashtag for your business',
      'Research trending hashtags weekly',
    ],
    bestPractices: [
      'Place hashtags in the first comment for cleaner aesthetics',
      'Avoid banned or shadowbanned hashtags',
      'Track hashtag performance monthly',
    ],
  };
}

function getDefaultLandingPage(purpose: string, productName: string): any {
  return {
    name: `${productName || 'Product'} Landing Page`,
    purpose: purpose || 'Lead Generation',
    headline: `Transform Your Business with ${productName || 'Our Solution'}`,
    subheadline: 'Join thousands of successful companies who trust us to drive growth',
    bodyCopy: `Discover how ${productName || 'our solution'} can help you achieve your goals faster. With our proven approach, you'll see results in weeks, not months. Our platform is designed for busy professionals who want powerful features without complexity.`,
    ctaText: 'Start Free Trial',
    ctaColor: '#4F46E5',
    features: [
      { title: 'Easy to Use', description: 'Intuitive interface that anyone can master in minutes' },
      { title: 'Powerful Analytics', description: 'Real-time insights to drive smarter decisions' },
      { title: '24/7 Support', description: 'Our team is here whenever you need help' },
      { title: 'Secure & Reliable', description: 'Enterprise-grade security you can trust' },
    ],
    testimonial: {
      quote: 'This product transformed how we do business. ROI was visible within the first month!',
      author: 'Jane Smith',
      company: 'Growth Co.',
    },
    colorScheme: {
      primary: '#4F46E5',
      secondary: '#10B981',
      background: '#F9FAFB',
      text: '#111827',
    },
    layout: 'hero-features-testimonial-cta',
    conversionTips: [
      'Add urgency with limited-time offers',
      'Include social proof (logos, testimonials)',
      'Minimize form fields to essentials only',
      'Use contrasting CTA button colors',
    ],
    seoSuggestions: {
      title: `${productName || 'Product'} - ${purpose || 'Start Your Free Trial'}`,
      description: `Discover how ${productName || 'our solution'} helps businesses grow. Start your free trial today and see results fast.`,
    },
  };
}

function getDefaultEmailCampaign(campaignType?: string, industry?: string, audience?: string) {
  return {
    name: `${(campaignType || 'Promotional').charAt(0).toUpperCase() + (campaignType || 'promotional').slice(1)} Email Campaign`,
    subject: "Don't Miss Out — Exclusive Offer Inside",
    previewText: "Limited-time deal just for you. Open now to save big.",
    sections: [
      {
        type: "header",
        heading: "Something Special Just for You",
        subheading: "Because our best customers deserve the best deals"
      },
      {
        type: "body",
        heading: "Why You'll Love This",
        content: "We've been working hard to bring you something truly special. For a limited time, we're offering an exclusive deal that's designed specifically for valued customers like you. This isn't just another promotion — it's our way of saying thank you for being part of our community."
      },
      {
        type: "feature",
        heading: "What You Get",
        items: [
          "Exclusive access to premium features",
          "Priority customer support",
          "Special member-only pricing",
          "Free shipping on all orders"
        ]
      },
      {
        type: "testimonial",
        quote: "This has completely transformed how we approach our business. The results speak for themselves — 40% growth in just 3 months.",
        author: "Sarah Johnson",
        role: "Marketing Director, TechCorp"
      },
      {
        type: "cta",
        heading: "Ready to Get Started?",
        buttonText: "Claim Your Offer Now",
        urgency: "Offer expires in 48 hours — don't wait!"
      }
    ],
    ctaText: "Claim Your Offer Now",
    ctaColor: "#4F46E5",
    estimatedOpenRate: 24.5,
    estimatedClickRate: 3.8,
    abVariants: [
      { subject: "Your Exclusive Offer Awaits ✨", angle: "Exclusivity" },
      { subject: "Last Chance: Save 30% Today Only", angle: "Urgency" },
      { subject: "We picked this just for you", angle: "Personalization" }
    ],
    sendTimeRec: "Tuesday 10:00 AM EST",
    tips: [
      "Personalize the subject line with the recipient's first name to boost open rates by 26%",
      "Keep the email under 200 words for mobile optimization — 65% of emails are read on mobile",
      "Add alt text to all images as many email clients block images by default",
      "Test sending on Tuesday and Thursday mornings for highest engagement",
      "Include a clear unsubscribe link to maintain deliverability and comply with CAN-SPAM"
    ]
  };
}

export default router;
