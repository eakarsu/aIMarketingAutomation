'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifySendGridSignature, twilioSignature, verifyTwilioSignature, eventDigest } = require('./webhookSecurity.cjs');

test('SendGrid signature accepts a fresh signed raw payload', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const timestamp = '1700000000';
  const rawBody = Buffer.from('[{"event":"delivered"}]');
  const signature = crypto.sign('sha256', Buffer.concat([Buffer.from(timestamp), rawBody]), privateKey).toString('base64');
  assert.equal(verifySendGridSignature({ publicKey, timestamp, signature, rawBody, now: 1700000000 * 1000 }), true);
});

test('SendGrid signature rejects tampering and stale events', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const timestamp = '1700000000';
  const rawBody = Buffer.from('{}');
  const signature = crypto.sign('sha256', Buffer.concat([Buffer.from(timestamp), rawBody]), privateKey).toString('base64');
  assert.equal(verifySendGridSignature({ publicKey, timestamp, signature, rawBody: Buffer.from('{"x":1}'), now: 1700000000 * 1000 }), false);
  assert.equal(verifySendGridSignature({ publicKey, timestamp, signature, rawBody, now: 1700001000 * 1000 }), false);
});

test('Twilio callback signature binds the URL and sorted form fields', () => {
  const authToken = 'test-auth-token';
  const url = 'https://hooks.example.test/api/inbound-webhooks/twilio?recipientId=abc';
  const params = { To: '+15555550100', MessageStatus: 'delivered', MessageSid: 'SM123' };
  const signature = twilioSignature(authToken, url, params);
  assert.equal(verifyTwilioSignature({ authToken, url, params, signature }), true);
  assert.equal(verifyTwilioSignature({ authToken, url, params: { ...params, MessageStatus: 'failed' }, signature }), false);
});

test('event digests are deterministic and payload-sensitive', () => {
  assert.equal(eventDigest({ a: 1 }), eventDigest({ a: 1 }));
  assert.notEqual(eventDigest({ a: 1 }), eventDigest({ a: 2 }));
});

