import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { dispatchScheduledCampaigns } from './services/sendExecutor';
import { runAutomationEngine } from './services/automationEngine';
import inboundWebhookRoutes from './routes/inboundWebhooks';
import abTestRoutes from './routes/abTestOrchestrator';
import customViewsRoutes from './routes/customViews';

// Routes
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import contactRoutes from './routes/contacts';
import segmentRoutes from './routes/segments';
import tagRoutes from './routes/tags';
import customFieldRoutes from './routes/customFields';
import templateRoutes from './routes/templates';
import automationRoutes from './routes/automations';
import landingPageRoutes from './routes/landingPages';
import formRoutes from './routes/forms';
import imageRoutes from './routes/images';
import analyticsRoutes from './routes/analytics';
import reviewRoutes from './routes/reviews';
import integrationRoutes from './routes/integrations';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';
import optionsRoutes from './routes/options';
import exportRoutes from './routes/export';
import webhookRoutes from './routes/webhooks';

// === BATCH 05 AUTO-MOUNT imports ===
import campaignOrchestratorAgentRouter from './routes/campaign-orchestrator-agent';
import realtimePersonalizationRouter from './routes/realtime-personalization';
import creativeTestAgentRouter from './routes/creative-test-agent';
import multiChannelJourneyRouter from './routes/multi-channel-journey';
import lifecycleWinbackRouter from './routes/lifecycle-winback';
import marketplaceIntegrationRouter from './routes/marketplace-integration';


dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, please try again later' } });
// Stricter limit for expensive AI generation endpoints
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'AI rate limit exceeded: max 30 requests per 15 minutes' } });

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/ai', aiLimiter);

// CORS — restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Make prisma available to routes
app.set('prisma', prisma);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/landing-pages', landingPageRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/inbound-webhooks', inboundWebhookRoutes); // PUBLIC — no auth (provider callbacks)
app.use('/api/ab-test', abTestRoutes);
app.use('/api/custom-views', customViewsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Background cron: send scheduled campaigns + run automation engine every minute
cron.schedule('* * * * *', async () => {
  try {
    const sendResult = await dispatchScheduledCampaigns(prisma);
    const autoResult = await runAutomationEngine(prisma);
    if (sendResult.campaignsProcessed || autoResult.stepsExecuted) {
      console.log(`[cron] sent ${sendResult.recipientsSent} recipients across ${sendResult.campaignsProcessed} campaigns; executed ${autoResult.stepsExecuted} automation steps`);
    }
  } catch (e) {
    console.error('[cron] error:', e);
  }
});

// Manual trigger endpoints (for testing without waiting for cron)
app.post('/api/admin/run-send-executor', async (req, res) => {
  try { res.json(await dispatchScheduledCampaigns(prisma)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/run-automation-engine', async (req, res) => {
  try { res.json(await runAutomationEngine(prisma)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/campaign-orchestrator-agent', campaignOrchestratorAgentRouter);
app.use('/api/realtime-personalization', realtimePersonalizationRouter);
app.use('/api/creative-test-agent', creativeTestAgentRouter);
app.use('/api/multi-channel-journey', multiChannelJourneyRouter);
app.use('/api/lifecycle-winback', lifecycleWinbackRouter);
app.use('/api/marketplace-integration', marketplaceIntegrationRouter);

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_customer_lifetime_value = require('./routes/gap-customer-lifetime-value'); (app as any).use('/api/gap-customer-lifetime-value', _gap_customer_lifetime_value.default || _gap_customer_lifetime_value); } catch(e) { console.error('gap mount fail customer-lifetime-value:', (e as any).message); }
try { const _gap_churn_risk = require('./routes/gap-churn-risk'); (app as any).use('/api/gap-churn-risk', _gap_churn_risk.default || _gap_churn_risk); } catch(e) { console.error('gap mount fail churn-risk:', (e as any).message); }
try { const _gap_product_recommendation = require('./routes/gap-product-recommendation'); (app as any).use('/api/gap-product-recommendation', _gap_product_recommendation.default || _gap_product_recommendation); } catch(e) { console.error('gap mount fail product-recommendation:', (e as any).message); }
try { const _gap_lead_scoring = require('./routes/gap-lead-scoring'); (app as any).use('/api/gap-lead-scoring', _gap_lead_scoring.default || _gap_lead_scoring); } catch(e) { console.error('gap mount fail lead-scoring:', (e as any).message); }
try { const _gap_mobile = require('./routes/gap-mobile'); (app as any).use('/api/gap-mobile', _gap_mobile.default || _gap_mobile); } catch(e) { console.error('gap mount fail mobile:', (e as any).message); }
try { const _gap_native = require('./routes/gap-native'); (app as any).use('/api/gap-native', _gap_native.default || _gap_native); } catch(e) { console.error('gap mount fail native:', (e as any).message); }
try { const _gap_lead = require('./routes/gap-lead'); (app as any).use('/api/gap-lead', _gap_lead.default || _gap_lead); } catch(e) { console.error('gap mount fail lead:', (e as any).message); }
try { const _gap_multi_language = require('./routes/gap-multi-language'); (app as any).use('/api/gap-multi-language', _gap_multi_language.default || _gap_multi_language); } catch(e) { console.error('gap mount fail multi-language:', (e as any).message); }
try { const _gap_payment = require('./routes/gap-payment'); (app as any).use('/api/gap-payment', _gap_payment.default || _gap_payment); } catch(e) { console.error('gap mount fail payment:', (e as any).message); }
// === End Batch 05 Mounts ===
