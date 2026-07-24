import { Router, Response } from 'express';
import { AIGenerationType, PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/marketing-advice', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    if (!apiKey || !model || baseUrl !== 'https://openrouter.ai/api/v1') {
      return res.status(503).json({ error: 'OpenRouter is not configured' });
    }

    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a marketing operations advisor. Return substantive, concise guidance with risks, measurable next actions, and governance considerations.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!providerResponse.ok) {
      console.error(`OpenRouter returned HTTP ${providerResponse.status}`);
      return res.status(502).json({ error: 'AI provider request failed' });
    }
    const payload: any = await providerResponse.json();
    const content = String(payload?.choices?.[0]?.message?.content || '').trim();
    if (!content) return res.status(502).json({ error: 'AI provider returned empty content' });

    const prisma: PrismaClient = req.app.get('prisma');
    const stored = await prisma.aIGeneration.create({
      data: {
        userId: req.userId!,
        type: AIGenerationType.CAMPAIGN_IDEA,
        prompt,
        result: content,
        metadata: JSON.stringify({ provider: 'openrouter', model }),
      },
    });
    return res.json({ content, provider: 'openrouter', model, persistedId: stored.id });
  } catch (error) {
    console.error('Runtime AI error:', error);
    return res.status(502).json({ error: 'AI provider request failed' });
  }
});

export default router;
