'use strict';

const crypto = require('node:crypto');

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySendGridSignature({ publicKey, timestamp, signature, rawBody, now = Date.now(), toleranceSeconds = 300 }) {
  if (!publicKey || !timestamp || !signature || !Buffer.isBuffer(rawBody)) return false;
  const eventTime = Number(timestamp) * 1000;
  if (!Number.isFinite(eventTime) || Math.abs(now - eventTime) > toleranceSeconds * 1000) return false;
  try {
    return crypto.verify('sha256', Buffer.concat([Buffer.from(String(timestamp)), rawBody]), publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

function twilioPayload(url, params) {
  return `${url}${Object.keys(params || {}).sort().map((key) => `${key}${params[key]}`).join('')}`;
}

function twilioSignature(authToken, url, params) {
  return crypto.createHmac('sha1', authToken).update(twilioPayload(url, params)).digest('base64');
}

function verifyTwilioSignature({ authToken, url, params, signature }) {
  if (!authToken || !url || !signature) return false;
  return safeEqual(twilioSignature(authToken, url, params), signature);
}

function eventDigest(value) {
  return crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
}

module.exports = { safeEqual, verifySendGridSignature, twilioSignature, verifyTwilioSignature, eventDigest };

