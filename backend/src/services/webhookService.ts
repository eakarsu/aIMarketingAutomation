/**
 * Campaign Performance Webhook Service
 *
 * Maintains a registry of subscriber webhooks. When campaign analytics are
 * updated the caller should invoke `dispatchCampaignPerformance` and every
 * registered URL will receive a POST request with the latest metrics.
 *
 * Registrations are stored in memory and persisted to a JSON file
 * (WEBHOOK_STORE_PATH env var, defaults to ./webhook-registrations.json).
 * For production replace the file-based store with a DB table.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface WebhookRegistration {
  id: string;
  userId: string;
  url: string;
  secret: string;       // HMAC signing secret supplied by the subscriber
  events: string[];     // e.g. ['campaign.performance']
  active: boolean;
  createdAt: string;
}

const STORE_PATH = process.env.WEBHOOK_STORE_PATH
  ?? path.resolve(process.cwd(), 'webhook-registrations.json');

// ---------- Persistence helpers ----------

function loadRegistrations(): WebhookRegistration[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

function saveRegistrations(regs: WebhookRegistration[]): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(regs, null, 2));
}

// ---------- Public API ----------

export function registerWebhook(userId: string, url: string, events: string[], secret?: string): WebhookRegistration {
  const regs = loadRegistrations();
  const reg: WebhookRegistration = {
    id: crypto.randomUUID(),
    userId,
    url,
    secret: secret ?? crypto.randomBytes(24).toString('hex'),
    events: events.length > 0 ? events : ['campaign.performance'],
    active: true,
    createdAt: new Date().toISOString(),
  };
  regs.push(reg);
  saveRegistrations(regs);
  return reg;
}

export function listWebhooks(userId: string): WebhookRegistration[] {
  return loadRegistrations().filter(r => r.userId === userId);
}

export function deleteWebhook(userId: string, id: string): boolean {
  const regs = loadRegistrations();
  const idx = regs.findIndex(r => r.id === id && r.userId === userId);
  if (idx === -1) return false;
  regs.splice(idx, 1);
  saveRegistrations(regs);
  return true;
}

// ---------- Dispatch ----------

export interface CampaignPerformancePayload {
  event: 'campaign.performance';
  timestamp: string;
  campaignId: string;
  campaignName: string;
  metrics: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    openRate: string;
    clickRate: string;
  };
}

/**
 * Sign the payload with HMAC-SHA256 using the registration's secret.
 * The receiver can verify: HMAC-SHA256(body, secret) == X-Webhook-Signature header.
 */
function sign(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch campaign.performance webhook to all matching active registrations.
 * Fires-and-forgets (non-blocking). Failures are logged but not thrown.
 */
export async function dispatchCampaignPerformance(
  userId: string,
  payload: Omit<CampaignPerformancePayload, 'event' | 'timestamp'>,
): Promise<void> {
  const regs = loadRegistrations().filter(
    r => r.userId === userId && r.active && r.events.includes('campaign.performance'),
  );

  if (regs.length === 0) return;

  const body: CampaignPerformancePayload = {
    event: 'campaign.performance',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const bodyStr = JSON.stringify(body);

  await Promise.allSettled(
    regs.map(async (reg) => {
      try {
        const sig = sign(bodyStr, reg.secret);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000); // 10-second timeout
        const res = await fetch(reg.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': sig,
            'X-Webhook-Id': reg.id,
            'X-Webhook-Event': 'campaign.performance',
          },
          body: bodyStr,
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          console.warn(`[webhook] ${reg.url} responded ${res.status}`);
        }
      } catch (err: any) {
        console.error(`[webhook] Delivery failed to ${reg.url}:`, err.message);
      }
    }),
  );
}
