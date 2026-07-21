'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DomainError,
  digest,
  normalizeEmail,
  normalizePhone,
  canonicalizeContact,
  mergeContact,
  reconcileSync,
  transitionLead,
  evaluateOutreach,
  DeliveryQueue,
  attributeConversion,
  measureDataQuality,
} = require('./core.cjs');

function contact(overrides = {}) {
  return { email: 'Lead@Example.com', phone: '+1 (212) 555-0100', firstName: 'Ada', lastName: 'Lovelace', company: 'Analytical', region: 'US', timezoneOffsetMinutes: -240, source: 'crm', sourceUpdatedAt: '2026-07-18T12:00:00.000Z', externalId: 'crm-1', ...overrides };
}

function consent(overrides = {}) {
  return { status: 'GRANTED', channels: ['EMAIL', 'SMS'], lawfulBasis: 'EXPLICIT_CONSENT', privacyNoticeAt: '2026-07-01T00:00:00.000Z', ...overrides };
}

function campaign(overrides = {}) {
  return { domainAuth: { spf: true, dkim: true, dmarc: true }, quietHours: { start: 21, end: 8 }, frequencyCap7Days: 3, recipientCount: 10, aiGenerated: false, sensitiveSegment: false, approvalStatus: 'NOT_REQUIRED', ...overrides };
}

function metrics(overrides = {}) {
  return { bounceRate: 0.01, complaintRate: 0.0001, tenantSentToday: 10, tenantDailyLimit: 1_000, contactSentLast7Days: 0, ...overrides };
}

test('normalizes email identity without provider-specific rewriting', () => {
  assert.equal(normalizeEmail(' Lead@Example.COM '), 'lead@example.com');
  assert.throws(() => normalizeEmail('not-an-email'), /invalid/);
});

test('normalizes phone to bounded E.164 digits', () => {
  assert.equal(normalizePhone('+1 (212) 555-0100'), '+12125550100');
  assert.throws(() => normalizePhone('123'), /8-15/);
});

test('canonicalizes source contacts and preserves provenance', () => {
  const result = canonicalizeContact(contact());
  assert.equal(result.email, 'lead@example.com');
  assert.equal(result.source, 'crm');
  assert.ok(Object.isFrozen(result));
});

test('rejects unsupported regions and oversized fields', () => {
  assert.throws(() => canonicalizeContact(contact({ region: 'MARS' })), /unsupported/);
  assert.throws(() => canonicalizeContact(contact({ company: 'x'.repeat(301) })), /too long/);
});

test('manual source wins over older enrichment data', () => {
  const result = mergeContact(contact({ source: 'manual', company: 'Verified' }), contact({ source: 'enrichment', company: 'Guessed', sourceUpdatedAt: '2026-07-19T12:00:00.000Z' }));
  assert.equal(result.company, 'Verified');
});

test('newer equal-precedence source updates fields', () => {
  const result = mergeContact(contact({ company: 'Old' }), contact({ company: 'New', sourceUpdatedAt: '2026-07-19T12:00:00.000Z' }));
  assert.equal(result.company, 'New');
  assert.equal(result.mergedDigest.length, 64);
});

test('merge rejects conflicting canonical identities', () => {
  assert.throws(() => mergeContact(contact(), contact({ email: 'other@example.com' })), /canonical email/);
});

test('sync reconciliation pulls changed records and skips unchanged digests', () => {
  const remote = canonicalizeContact(contact(), 'crm');
  const unchanged = reconcileSync([{ externalId: 'crm-1', email: remote.email, remoteDigest: digest(remote) }], [contact()], { source: 'crm', cursor: 'cursor-1' });
  assert.equal(unchanged.pulls.length, 0);
  const changed = reconcileSync([{ externalId: 'crm-1', email: remote.email, remoteDigest: 'old' }], [contact()], { source: 'crm', cursor: 'cursor-2' });
  assert.equal(changed.pulls.length, 1);
});

test('sync reconciliation propagates remote deletion tombstones', () => {
  const result = reconcileSync([], [], { source: 'crm', cursor: 'cursor-2', deletedExternalIds: ['crm-9'] });
  assert.deepEqual(result.tombstones.map((item) => item.externalId), ['crm-9']);
});

test('sync reconciliation quarantines identity conflicts', () => {
  const result = reconcileSync([{ externalId: 'crm-1', email: 'first@example.com', remoteDigest: 'old' }], [contact({ email: 'second@example.com' })], { source: 'crm', cursor: 'cursor' });
  assert.equal(result.pulls.length, 0);
  assert.equal(result.conflicts[0].code, 'IDENTITY_CONFLICT');
});

test('sync reconciliation rejects duplicate external IDs', () => {
  assert.throws(() => reconcileSync([], [contact(), contact()], { source: 'crm', cursor: 'cursor' }), /duplicate externalId/);
});

test('lead lifecycle follows explicit forward transitions', () => {
  const qualified = transitionLead({ state: 'NEW' }, { to: 'QUALIFIED', reason: 'meets ICP', actorId: 'user-1', at: '2026-07-18T12:00:00.000Z' });
  const assigned = transitionLead(qualified, { to: 'ASSIGNED', ownerId: 'seller-1', reason: 'territory match', actorId: 'user-1' });
  assert.equal(assigned.state, 'ASSIGNED');
  assert.equal(assigned.ownerId, 'seller-1');
});

test('lead lifecycle rejects skipped states and missing ownership', () => {
  assert.throws(() => transitionLead({ state: 'NEW' }, { to: 'CONVERTED', reason: 'skip', actorId: 'user-1' }), /cannot transition/);
  assert.throws(() => transitionLead({ state: 'QUALIFIED' }, { to: 'ASSIGNED', reason: 'missing', actorId: 'user-1' }), /owner/);
});

test('sales handoff requires explicit approval', () => {
  assert.throws(() => transitionLead({ state: 'ENGAGED', ownerId: 'seller-1' }, { to: 'SALES_ACCEPTED', reason: 'handoff', actorId: 'user-1' }), /approval/);
  const accepted = transitionLead({ state: 'ENGAGED', ownerId: 'seller-1' }, { to: 'SALES_ACCEPTED', reason: 'handoff', actorId: 'user-1', approval: { id: 'approval-1', decision: 'APPROVED' } });
  assert.equal(accepted.handoffStatus, 'ACCEPTED');
});

test('conversion requires durable evidence', () => {
  assert.throws(() => transitionLead({ state: 'SALES_ACCEPTED', ownerId: 'seller-1' }, { to: 'CONVERTED', reason: 'won', actorId: 'user-1' }), /evidence/);
});

test('recycled leads receive an explicit retry time', () => {
  const result = transitionLead({ state: 'ENGAGED', ownerId: 'seller-1' }, { to: 'RECYCLED', reason: 'not ready', actorId: 'user-1', retryAt: '2026-08-18T12:00:00.000Z' });
  assert.equal(result.handoffStatus, 'RETURNED');
  assert.match(result.retryAt, /^2026-08-18/);
});

test('outreach allows a consented, authenticated, within-budget email', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'ACTIVE', optedOutAt: null }, channel: 'EMAIL', consent: consent(), campaign: campaign(), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.equal(result.allowed, true);
  assert.equal(result.policyDigest.length, 64);
});

test('outreach blocks inactive, opted-out, and suppressed contacts', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'UNSUBSCRIBED', optedOutAt: '2026-07-01' }, channel: 'EMAIL', consent: consent(), suppressions: [{ active: true, channel: 'ALL' }], campaign: campaign(), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('CONTACT_NOT_ACTIVE'));
  assert.ok(result.reasons.includes('CONTACT_OPTED_OUT'));
  assert.ok(result.reasons.includes('SUPPRESSED'));
});

test('outreach enforces explicit consent in EU and UK', () => {
  const result = evaluateOutreach({ contact: { ...contact({ region: 'EU' }), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent({ lawfulBasis: 'LEGITIMATE_INTEREST' }), campaign: campaign(), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('EXPLICIT_CONSENT_REQUIRED'));
});

test('outreach enforces California privacy notice', () => {
  const result = evaluateOutreach({ contact: { ...contact({ region: 'CA' }), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent({ privacyNoticeAt: null }), campaign: campaign(), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('PRIVACY_NOTICE_REQUIRED'));
});

test('email outreach requires SPF, DKIM, and DMARC evidence', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent(), campaign: campaign({ domainAuth: { spf: true, dkim: false, dmarc: true } }), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('DOMAIN_AUTH_REQUIRED'));
});

test('outreach pauses on bounce and complaint thresholds', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent(), campaign: campaign(), metrics: metrics({ bounceRate: 0.051, complaintRate: 0.002 }), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('BOUNCE_RATE_TOO_HIGH'));
  assert.ok(result.reasons.includes('COMPLAINT_RATE_TOO_HIGH'));
});

test('outreach enforces tenant and contact frequency limits', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent(), campaign: campaign(), metrics: metrics({ tenantSentToday: 1000, contactSentLast7Days: 3 }), now: '2026-07-18T16:00:00.000Z' });
  assert.ok(result.reasons.includes('TENANT_RATE_LIMIT'));
  assert.ok(result.reasons.includes('FREQUENCY_CAP'));
});

test('outreach respects recipient-local quiet hours', () => {
  const result = evaluateOutreach({ contact: { ...contact({ timezoneOffsetMinutes: 0 }), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent(), campaign: campaign(), metrics: metrics(), now: '2026-07-18T23:00:00.000Z' });
  assert.ok(result.reasons.includes('QUIET_HOURS'));
});

test('large and AI-generated campaigns require human review', () => {
  const result = evaluateOutreach({ contact: { ...contact(), status: 'ACTIVE' }, channel: 'EMAIL', consent: consent(), campaign: campaign({ aiGenerated: true, recipientCount: 2000, approvalStatus: 'PENDING' }), metrics: metrics(), now: '2026-07-18T16:00:00.000Z' });
  assert.equal(result.reviewRequired, true);
  assert.ok(result.reasons.includes('HUMAN_APPROVAL_REQUIRED'));
});

test('delivery queue rejects policy-blocked work', () => {
  const queue = new DeliveryQueue();
  assert.throws(() => queue.enqueue({ tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: false, reasons: ['SUPPRESSED'] } }), /blocked/);
});

test('delivery queue is idempotent within a tenant', () => {
  const queue = new DeliveryQueue();
  const input = { tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: true, policyDigest: 'policy' } };
  assert.equal(queue.enqueue(input).id, queue.enqueue(input).id);
});

test('delivery completion requires a provider receipt', () => {
  const queue = new DeliveryQueue();
  const job = queue.enqueue({ tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: true, policyDigest: 'policy' } });
  queue.claim('worker-1');
  assert.throws(() => queue.complete(job.id, 'worker-1', {}), /receipt/);
  assert.equal(queue.complete(job.id, 'worker-1', { provider: 'sendgrid', messageId: 'message-1' }).status, 'SENT');
});

test('delivery leases reject stale workers', () => {
  let now = 100;
  const queue = new DeliveryQueue({ now: () => now });
  const job = queue.enqueue({ tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: true, policyDigest: 'policy' } });
  queue.claim('worker-1', 5);
  now = 106;
  assert.throws(() => queue.complete(job.id, 'worker-1', { provider: 'sendgrid', messageId: 'message' }), /lease/);
});

test('retryable delivery failures back off then dead-letter', () => {
  let now = 100;
  const queue = new DeliveryQueue({ now: () => now });
  const job = queue.enqueue({ tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: true, policyDigest: 'policy' } });
  let failed;
  for (let attempt = 0; attempt < 3; attempt++) {
    queue.claim('worker-1');
    failed = queue.fail(job.id, 'worker-1', { code: 'RATE_LIMIT', message: 'later', retryable: true });
    now = failed.availableAt;
  }
  assert.equal(failed.status, 'DEAD_LETTER');
});

test('pending delivery can be cancelled only by its tenant', () => {
  const queue = new DeliveryQueue();
  const job = queue.enqueue({ tenantId: 'tenant-1', campaignId: 'campaign-1', contactId: 'contact-1', channel: 'EMAIL', idempotencyKey: 'key-1', policy: { allowed: true, policyDigest: 'policy' } });
  assert.throws(() => queue.cancel('tenant-2', job.id), /not found/);
  assert.equal(queue.cancel('tenant-1', job.id).status, 'CANCELLED');
});

test('attribution supports first, last, and linear models', () => {
  const touches = [
    { id: 'touch-1', contactId: 'contact-1', occurredAt: '2026-07-01' },
    { id: 'touch-2', contactId: 'contact-1', occurredAt: '2026-07-10' },
    { id: 'other', contactId: 'contact-2', occurredAt: '2026-07-11' },
  ];
  const conversion = { contactId: 'contact-1', occurredAt: '2026-07-18' };
  assert.equal(attributeConversion(touches, conversion, 'FIRST_TOUCH')[0].touchId, 'touch-1');
  assert.equal(attributeConversion(touches, conversion, 'LAST_TOUCH')[0].touchId, 'touch-2');
  assert.deepEqual(attributeConversion(touches, conversion, 'LINEAR').map((item) => item.credit), [0.5, 0.5]);
});

test('attribution ignores post-conversion and cross-contact touches', () => {
  const result = attributeConversion([{ id: 'late', contactId: 'contact-1', occurredAt: '2026-08-01' }, { id: 'other', contactId: 'contact-2', occurredAt: '2026-07-01' }], { contactId: 'contact-1', occurredAt: '2026-07-18' });
  assert.deepEqual(result, []);
});

test('data quality measures validity, duplicates, consent, and ownership', () => {
  const result = measureDataQuality([
    { email: 'one@example.com', consentStatus: 'GRANTED', ownerId: 'seller-1' },
    { email: 'ONE@example.com', consentStatus: 'UNKNOWN' },
    { email: 'bad', consentStatus: 'GRANTED', ownerId: 'seller-1' },
  ]);
  assert.equal(result.total, 3);
  assert.equal(result.duplicateRate, 1 / 3);
  assert.ok(result.score > 0 && result.score < 1);
});

test('empty data quality dataset is explicit rather than perfect', () => {
  assert.deepEqual(measureDataQuality([]), { total: 0, validEmailRate: 0, duplicateRate: 0, consentCoverage: 0, ownerCoverage: 0, score: 0 });
});
