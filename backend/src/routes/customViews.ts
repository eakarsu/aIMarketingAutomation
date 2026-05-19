// Custom Views API — 4 endpoints for marketing automation visualizations & tooling
// Mounted at: /api/custom-views
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// In-memory persistence (workflows + email templates)
const workflows: Array<{ id: string; name: string; nodes: any[]; edges: any[]; createdAt: string }> = [];
const emailTemplates: Array<{ id: string; name: string; subject: string; body: string; updatedAt: string }> = [
  { id: 'tpl_welcome', name: 'Welcome Email', subject: 'Welcome, {{firstName}}!', body: 'Hi {{firstName}},\n\nThanks for joining {{company}}. Use code {{coupon}} for 10% off.\n\n— The Team', updatedAt: new Date().toISOString() },
  { id: 'tpl_winback', name: 'Win-back', subject: 'We miss you, {{firstName}}', body: 'Hi {{firstName}},\n\nIt\'s been a while. Come back with {{discount}} off.\n\n— {{company}}', updatedAt: new Date().toISOString() },
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// -------- VIZ 1: Campaign Funnel ----------------------------------
router.get('/funnel', async (_req: Request, res: Response) => {
  // Deterministic but realistic funnel numbers (with slight variation each call)
  const sent = 10000;
  const opened = Math.round(sent * (0.42 + Math.random() * 0.05));
  const clicked = Math.round(opened * (0.28 + Math.random() * 0.05));
  const converted = Math.round(clicked * (0.22 + Math.random() * 0.05));
  res.json({
    feature: 'campaign-funnel',
    generatedAt: new Date().toISOString(),
    stages: [
      { stage: 'Sent', value: sent, color: '#3b82f6' },
      { stage: 'Opened', value: opened, color: '#8b5cf6' },
      { stage: 'Clicked', value: clicked, color: '#ec4899' },
      { stage: 'Converted', value: converted, color: '#10b981' },
    ],
    summary: {
      openRate: ((opened / sent) * 100).toFixed(1) + '%',
      clickRate: ((clicked / opened) * 100).toFixed(1) + '%',
      conversionRate: ((converted / clicked) * 100).toFixed(1) + '%',
      overall: ((converted / sent) * 100).toFixed(2) + '%',
    },
  });
});

// -------- VIZ 2: Cohort Engagement Heatmap ------------------------
router.get('/cohort-engagement', async (_req: Request, res: Response) => {
  const cohorts = ['2026-W14', '2026-W15', '2026-W16', '2026-W17', '2026-W18', '2026-W19'];
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const rows = cohorts.map((cohort, i) => {
    const cells = weeks.map((w, j) => {
      if (j > cohorts.length - i + 1) return { week: w, engagement: null as number | null, contacts: 0 };
      // Decay engagement over weeks since signup
      const base = 78 - j * 7 - i * 1.2 + (Math.random() * 6 - 3);
      const eng = Math.max(0, Math.min(100, Math.round(base)));
      const contacts = Math.round(900 - i * 60 - j * 30 + Math.random() * 40);
      return { week: w, engagement: eng, contacts: Math.max(0, contacts) };
    });
    return { cohort, cells };
  });
  res.json({
    feature: 'cohort-engagement',
    generatedAt: new Date().toISOString(),
    cohorts,
    weeks,
    rows,
  });
});

// -------- NON-VIZ 1: Workflow Builder save ------------------------
router.post('/workflows', async (req: Request, res: Response) => {
  const { name, nodes, edges } = req.body || {};
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return res.status(400).json({ error: 'nodes (array) and edges (array) required' });
  }
  const workflow = {
    id: uid('wf'),
    name: typeof name === 'string' && name ? name : 'Untitled Workflow',
    nodes,
    edges,
    createdAt: new Date().toISOString(),
  };
  workflows.unshift(workflow);
  if (workflows.length > 100) workflows.length = 100;
  res.json({ workflow_id: workflow.id, workflow });
});

router.get('/workflows', async (_req: Request, res: Response) => {
  res.json({ workflows });
});

// -------- NON-VIZ 2: Email Template Editor (CRUD) -----------------
router.get('/email-templates', async (_req: Request, res: Response) => {
  res.json({ templates: emailTemplates });
});

router.post('/email-templates', async (req: Request, res: Response) => {
  const { id, name, subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });

  if (id) {
    const idx = emailTemplates.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'template not found' });
    emailTemplates[idx] = {
      ...emailTemplates[idx],
      name: name || emailTemplates[idx].name,
      subject,
      body,
      updatedAt: new Date().toISOString(),
    };
    return res.json({ template: emailTemplates[idx] });
  }

  const tpl = {
    id: uid('tpl'),
    name: name || 'Untitled Template',
    subject,
    body,
    updatedAt: new Date().toISOString(),
  };
  emailTemplates.unshift(tpl);
  res.json({ template: tpl });
});

router.delete('/email-templates/:id', async (req: Request, res: Response) => {
  const idx = emailTemplates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [removed] = emailTemplates.splice(idx, 1);
  res.json({ deleted: removed.id });
});

export default router;
