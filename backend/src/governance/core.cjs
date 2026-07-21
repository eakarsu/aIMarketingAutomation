'use strict';

const crypto = require('node:crypto');

class DomainError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function digest(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function boundedString(value, name, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return undefined;
  if (typeof value !== 'string') throw new DomainError('INVALID_INPUT', `${name} must be a string`);
  const text = value.trim();
  if (!text || Buffer.byteLength(text) > max || text.includes('\0')) throw new DomainError('INVALID_INPUT', `${name} is empty or too long`);
  return text;
}

function normalizeEmail(value) {
  const email = boundedString(value, 'email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError('INVALID_EMAIL', 'email is invalid');
  const [local, domain] = email.split('@');
  return `${local}@${domain.normalize('NFKC')}`;
}

function normalizePhone(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = boundedString(value, 'phone', 40);
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) throw new DomainError('INVALID_PHONE', 'phone must contain 8-15 digits');
  return `+${digits}`;
}

const SOURCE_PRECEDENCE = Object.freeze({ enrichment: 1, form: 2, calendar: 2, crm: 3, consent: 4, manual: 5 });

function canonicalizeContact(value, source = 'crm') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('INVALID_INPUT', 'contact must be an object');
  const email = normalizeEmail(value.email);
  const firstName = boundedString(value.firstName, 'firstName', 200, true);
  const lastName = boundedString(value.lastName, 'lastName', 200, true);
  const region = boundedString(value.region || 'UNKNOWN', 'region', 32).toUpperCase();
  if (!['EU', 'UK', 'US', 'CA', 'BR', 'AU', 'UNKNOWN'].includes(region)) throw new DomainError('INVALID_REGION', 'region is unsupported');
  return Object.freeze({
    email,
    phone: normalizePhone(value.phone),
    firstName,
    lastName,
    company: boundedString(value.company, 'company', 300, true),
    region,
    timezoneOffsetMinutes: Number.isInteger(value.timezoneOffsetMinutes) && value.timezoneOffsetMinutes >= -720 && value.timezoneOffsetMinutes <= 840 ? value.timezoneOffsetMinutes : 0,
    source,
    sourceUpdatedAt: new Date(value.sourceUpdatedAt || 0).toISOString(),
    externalId: boundedString(value.externalId, 'externalId', 300, true),
    attributes: value.attributes && typeof value.attributes === 'object' && !Array.isArray(value.attributes) ? structuredClone(value.attributes) : {},
  });
}

function mergeContact(currentRaw, incomingRaw) {
  const current = canonicalizeContact(currentRaw, currentRaw.source || 'crm');
  const incoming = canonicalizeContact(incomingRaw, incomingRaw.source || 'crm');
  if (current.email !== incoming.email) throw new DomainError('IDENTITY_CONFLICT', 'contacts do not share the canonical email identity');
  const currentRank = SOURCE_PRECEDENCE[current.source] || 0;
  const incomingRank = SOURCE_PRECEDENCE[incoming.source] || 0;
  const incomingNewer = new Date(incoming.sourceUpdatedAt).getTime() >= new Date(current.sourceUpdatedAt).getTime();
  const preferIncoming = incomingRank > currentRank || (incomingRank === currentRank && incomingNewer);
  const mergeField = (field) => preferIncoming ? incoming[field] ?? current[field] : current[field] ?? incoming[field];
  return Object.freeze({
    ...current,
    phone: mergeField('phone'),
    firstName: mergeField('firstName'),
    lastName: mergeField('lastName'),
    company: mergeField('company'),
    region: mergeField('region'),
    timezoneOffsetMinutes: mergeField('timezoneOffsetMinutes'),
    source: preferIncoming ? incoming.source : current.source,
    sourceUpdatedAt: preferIncoming ? incoming.sourceUpdatedAt : current.sourceUpdatedAt,
    externalId: mergeField('externalId'),
    attributes: Object.freeze({ ...current.attributes, ...incoming.attributes }),
    mergedDigest: digest([current, incoming]),
  });
}

function reconcileSync(existingMappings, remoteRecords, { source, cursor, deletedExternalIds = [] }) {
  const seen = new Set();
  const byExternal = new Map(existingMappings.map((mapping) => [mapping.externalId, mapping]));
  const pulls = [];
  const conflicts = [];
  for (const raw of remoteRecords) {
    const record = canonicalizeContact(raw, source);
    if (!record.externalId) throw new DomainError('INVALID_INPUT', 'remote record requires externalId');
    if (seen.has(record.externalId)) throw new DomainError('DUPLICATE_REMOTE_RECORD', `duplicate externalId ${record.externalId}`);
    seen.add(record.externalId);
    const existing = byExternal.get(record.externalId);
    if (existing && existing.remoteDigest === digest(record)) continue;
    if (existing && existing.email && normalizeEmail(existing.email) !== record.email) {
      conflicts.push({ externalId: record.externalId, code: 'IDENTITY_CONFLICT', previousEmail: existing.email, incomingEmail: record.email });
      continue;
    }
    pulls.push({ externalId: record.externalId, contact: record, remoteDigest: digest(record), cursor });
  }
  const tombstones = deletedExternalIds.map((externalId) => {
    boundedString(externalId, 'deletedExternalId', 300);
    return { externalId, deletedAt: new Date().toISOString(), cursor };
  });
  return Object.freeze({ pulls: Object.freeze(pulls), conflicts: Object.freeze(conflicts), tombstones: Object.freeze(tombstones), cursor });
}

const TRANSITIONS = Object.freeze({
  NEW: new Set(['QUALIFIED', 'DISQUALIFIED']),
  QUALIFIED: new Set(['ASSIGNED', 'DISQUALIFIED']),
  ASSIGNED: new Set(['ENGAGED', 'RECYCLED', 'DISQUALIFIED']),
  ENGAGED: new Set(['SALES_ACCEPTED', 'RECYCLED', 'DISQUALIFIED']),
  SALES_ACCEPTED: new Set(['CONVERTED', 'RECYCLED', 'DISQUALIFIED']),
  RECYCLED: new Set(['QUALIFIED', 'DISQUALIFIED']),
  CONVERTED: new Set(),
  DISQUALIFIED: new Set(['RECYCLED']),
});

function transitionLead(lead, command) {
  const from = boundedString(lead.state, 'lead.state', 32).toUpperCase();
  const to = boundedString(command.to, 'transition.to', 32).toUpperCase();
  if (!TRANSITIONS[from]?.has(to)) throw new DomainError('INVALID_TRANSITION', `${from} cannot transition to ${to}`, 409);
  const ownerId = command.ownerId || lead.ownerId;
  if (['ASSIGNED', 'ENGAGED', 'SALES_ACCEPTED', 'CONVERTED'].includes(to) && !ownerId) throw new DomainError('OWNER_REQUIRED', `${to} requires an owner`, 422);
  if (to === 'SALES_ACCEPTED' && command.approval?.decision !== 'APPROVED') throw new DomainError('APPROVAL_REQUIRED', 'sales acceptance requires approval', 422);
  if (to === 'CONVERTED' && !command.conversionId) throw new DomainError('CONVERSION_REQUIRED', 'conversion evidence is required', 422);
  const reason = boundedString(command.reason, 'transition.reason', 1_000);
  return Object.freeze({
    ...lead,
    state: to,
    ownerId,
    handoffStatus: to === 'SALES_ACCEPTED' ? 'ACCEPTED' : to === 'RECYCLED' ? 'RETURNED' : lead.handoffStatus || 'NONE',
    retryAt: to === 'RECYCLED' ? new Date(command.retryAt).toISOString() : null,
    lastTransition: Object.freeze({ from, to, reason, actorId: boundedString(command.actorId, 'actorId', 128), approvalId: command.approval?.id || null, at: new Date(command.at || Date.now()).toISOString() }),
  });
}

function evaluateOutreach({ contact, channel, consent, suppressions = [], campaign, metrics, now = new Date() }) {
  const normalizedChannel = boundedString(channel, 'channel', 16).toUpperCase();
  if (!['EMAIL', 'SMS'].includes(normalizedChannel)) throw new DomainError('UNSUPPORTED_CHANNEL', 'channel must be EMAIL or SMS');
  const reasons = [];
  if (contact.status !== 'ACTIVE') reasons.push('CONTACT_NOT_ACTIVE');
  if (contact.optedOutAt) reasons.push('CONTACT_OPTED_OUT');
  if (suppressions.some((item) => item.active && (item.channel === 'ALL' || item.channel === normalizedChannel))) reasons.push('SUPPRESSED');
  if (!consent || consent.status !== 'GRANTED' || !consent.channels?.includes(normalizedChannel)) reasons.push('CONSENT_NOT_GRANTED');
  if (['EU', 'UK'].includes(contact.region) && consent?.lawfulBasis !== 'EXPLICIT_CONSENT') reasons.push('EXPLICIT_CONSENT_REQUIRED');
  if (contact.region === 'CA' && !consent?.privacyNoticeAt) reasons.push('PRIVACY_NOTICE_REQUIRED');
  if (normalizedChannel === 'EMAIL' && (!campaign.domainAuth?.spf || !campaign.domainAuth?.dkim || !campaign.domainAuth?.dmarc)) reasons.push('DOMAIN_AUTH_REQUIRED');
  if (metrics.bounceRate > 0.05) reasons.push('BOUNCE_RATE_TOO_HIGH');
  if (metrics.complaintRate > 0.001) reasons.push('COMPLAINT_RATE_TOO_HIGH');
  if (metrics.tenantSentToday >= metrics.tenantDailyLimit) reasons.push('TENANT_RATE_LIMIT');
  if (metrics.contactSentLast7Days >= (campaign.frequencyCap7Days || 3)) reasons.push('FREQUENCY_CAP');
  const localHour = (new Date(now).getUTCHours() + Math.trunc((contact.timezoneOffsetMinutes || 0) / 60) + 24) % 24;
  const quietStart = campaign.quietHours?.start ?? 21;
  const quietEnd = campaign.quietHours?.end ?? 8;
  if (quietStart > quietEnd ? localHour >= quietStart || localHour < quietEnd : localHour >= quietStart && localHour < quietEnd) reasons.push('QUIET_HOURS');
  const reviewRequired = Boolean(campaign.aiGenerated || campaign.recipientCount > 1_000 || campaign.sensitiveSegment);
  if (reviewRequired && campaign.approvalStatus !== 'APPROVED') reasons.push('HUMAN_APPROVAL_REQUIRED');
  return Object.freeze({ allowed: reasons.length === 0, reasons: Object.freeze(reasons), reviewRequired, evaluatedAt: new Date(now).toISOString(), policyDigest: digest({ channel: normalizedChannel, campaign, metrics }) });
}

class DeliveryQueue {
  constructor({ now = () => Date.now(), id = () => crypto.randomUUID() } = {}) {
    this.now = now;
    this.id = id;
    this.jobs = new Map();
    this.keys = new Map();
    this.events = [];
  }

  enqueue({ tenantId, campaignId, contactId, channel, idempotencyKey, policy }) {
    if (!policy?.allowed) throw new DomainError('POLICY_BLOCK', `outreach blocked: ${(policy?.reasons || []).join(', ')}`, 422);
    const key = `${tenantId}:${idempotencyKey}`;
    if (this.keys.has(key)) return structuredClone(this.jobs.get(this.keys.get(key)));
    const job = { id: this.id(), tenantId, campaignId, contactId, channel, status: 'QUEUED', attempt: 0, maxAttempts: 3, availableAt: this.now(), leaseOwner: null, leaseUntil: null, providerReceipt: null, error: null, createdAt: this.now() };
    this.jobs.set(job.id, job);
    this.keys.set(key, job.id);
    this.record(job, 'QUEUED', { policyDigest: policy.policyDigest });
    return structuredClone(job);
  }

  claim(workerId, leaseMs = 30_000) {
    const job = [...this.jobs.values()].find((candidate) => ['QUEUED', 'RETRY_WAIT'].includes(candidate.status) && candidate.availableAt <= this.now());
    if (!job) return null;
    job.status = 'RUNNING';
    job.attempt += 1;
    job.leaseOwner = workerId;
    job.leaseUntil = this.now() + leaseMs;
    this.record(job, 'CLAIMED', { workerId, attempt: job.attempt });
    return structuredClone(job);
  }

  complete(id, workerId, receipt) {
    const job = this.assertLease(id, workerId);
    if (!receipt?.provider || !receipt?.messageId) throw new DomainError('RECEIPT_REQUIRED', 'provider receipt with messageId is required');
    job.status = 'SENT';
    job.providerReceipt = Object.freeze({ provider: receipt.provider, messageId: receipt.messageId, acceptedAt: receipt.acceptedAt || new Date(this.now()).toISOString() });
    job.leaseOwner = null;
    job.leaseUntil = null;
    this.record(job, 'PROVIDER_ACCEPTED', { provider: receipt.provider, messageIdDigest: digest(receipt.messageId) });
    return structuredClone(job);
  }

  fail(id, workerId, error) {
    const job = this.assertLease(id, workerId);
    const retryable = Boolean(error?.retryable);
    job.error = { code: error?.code || 'DELIVERY_FAILURE', message: String(error?.message || 'delivery failed').slice(0, 1_000), retryable };
    job.status = retryable && job.attempt < job.maxAttempts ? 'RETRY_WAIT' : retryable ? 'DEAD_LETTER' : 'FAILED';
    job.availableAt = this.now() + Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempt - 1));
    job.leaseOwner = null;
    job.leaseUntil = null;
    this.record(job, 'FAILED', { code: job.error.code, retryable });
    return structuredClone(job);
  }

  cancel(tenantId, id) {
    const job = this.jobs.get(id);
    if (!job || job.tenantId !== tenantId) throw new DomainError('NOT_FOUND', 'delivery job not found', 404);
    if (!['QUEUED', 'RETRY_WAIT'].includes(job.status)) throw new DomainError('INVALID_STATE', 'only pending jobs can be cancelled', 409);
    job.status = 'CANCELLED';
    this.record(job, 'CANCELLED', {});
    return structuredClone(job);
  }

  assertLease(id, workerId) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'RUNNING' || job.leaseOwner !== workerId || job.leaseUntil < this.now()) throw new DomainError('LEASE_CONFLICT', 'active delivery lease required', 409, true);
    return job;
  }

  record(job, type, data) {
    this.events.push(Object.freeze({ id: this.id(), tenantId: job.tenantId, jobId: job.id, type, data: structuredClone(data), at: this.now() }));
  }
}

function attributeConversion(touches, conversion, model = 'LINEAR') {
  const eligible = touches.filter((touch) => touch.contactId === conversion.contactId && new Date(touch.occurredAt) <= new Date(conversion.occurredAt));
  if (!eligible.length) return [];
  if (model === 'FIRST_TOUCH') return [{ touchId: eligible[0].id, credit: 1 }];
  if (model === 'LAST_TOUCH') return [{ touchId: eligible[eligible.length - 1].id, credit: 1 }];
  if (model !== 'LINEAR') throw new DomainError('INVALID_ATTRIBUTION_MODEL', 'unsupported attribution model');
  const credit = 1 / eligible.length;
  return eligible.map((touch) => ({ touchId: touch.id, credit }));
}

function measureDataQuality(records) {
  const total = records.length;
  if (!total) return Object.freeze({ total: 0, validEmailRate: 0, duplicateRate: 0, consentCoverage: 0, ownerCoverage: 0, score: 0 });
  const emails = [];
  let valid = 0, consented = 0, owned = 0;
  for (const record of records) {
    try { emails.push(normalizeEmail(record.email)); valid++; } catch { emails.push(null); }
    if (record.consentStatus === 'GRANTED') consented++;
    if (record.ownerId) owned++;
  }
  const validEmails = emails.filter(Boolean);
  const duplicateCount = validEmails.length - new Set(validEmails).size;
  const metrics = {
    total,
    validEmailRate: valid / total,
    duplicateRate: duplicateCount / total,
    consentCoverage: consented / total,
    ownerCoverage: owned / total,
  };
  return Object.freeze({ ...metrics, score: Number(Math.max(0, metrics.validEmailRate * 0.35 + (1 - metrics.duplicateRate) * 0.25 + metrics.consentCoverage * 0.25 + metrics.ownerCoverage * 0.15).toFixed(3)) });
}

module.exports = {
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
};
