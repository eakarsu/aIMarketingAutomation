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
import dashboardRoutes from './routes/dashboard';
import optionsRoutes from './routes/options';
import exportRoutes from './routes/export';
import webhookRoutes from './routes/webhooks';
import sourceConnectionRoutes from './routes/sourceConnections';
import governanceRoutes from './routes/governance';
import { authMiddleware } from './middleware/auth';
import { requireRole } from './middleware/rbac';


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

app.use(express.json({ limit: '5mb', verify: (req, _res, buffer) => { (req as any).rawBody = Buffer.from(buffer); } }));
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/inbound-webhooks', inboundWebhookRoutes); // PUBLIC — no auth (provider callbacks)
app.use('/api/source-connections', sourceConnectionRoutes);
app.use('/api/governance', governanceRoutes);

// Generated recommendation endpoints previously returned synthetic feature output.
// Keep explicit tombstones so old clients fail honestly instead of receiving demos.
const retiredFeatureRoutes = [
  '/api/campaign-orchestrator-agent', '/api/realtime-personalization', '/api/creative-test-agent',
  '/api/multi-channel-journey', '/api/lifecycle-winback', '/api/marketplace-integration',
  '/api/gap-customer-lifetime-value', '/api/gap-churn-risk', '/api/gap-product-recommendation',
  '/api/gap-lead-scoring', '/api/gap-mobile', '/api/gap-native', '/api/gap-lead',
  '/api/gap-multi-language', '/api/gap-payment',
  '/api/ai', '/api/ab-test', '/api/custom-views', '/api/consent-fatigue',
];
for (const route of retiredFeatureRoutes) app.use(route, (_req, res) => res.status(410).json({ error: 'Generated simulation retired; use governed source, lifecycle, and delivery APIs' }));

// Background cron only creates durable work. Provider I/O runs in deliveryWorker.
cron.schedule('* * * * *', async () => {
  try {
    const sendResult = await dispatchScheduledCampaigns(prisma);
    const autoResult = await runAutomationEngine(prisma);
    if (sendResult.campaignsProcessed || autoResult.stepsExecuted) {
      console.log(`[cron] queued ${sendResult.recipientsQueued} recipients (${sendResult.recipientsBlocked} blocked) across ${sendResult.campaignsProcessed} campaigns; executed ${autoResult.stepsExecuted} non-outreach automation steps`);
    }
  } catch (e) {
    console.error('[cron] error:', e);
  }
});

// Manual trigger endpoints (for testing without waiting for cron)
app.post('/api/admin/run-send-executor', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try { res.json(await dispatchScheduledCampaigns(prisma)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/run-automation-engine', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try { res.json(await runAutomationEngine(prisma)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Error handling must be registered after every route.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({ error: 'Something went wrong!' });
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
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
