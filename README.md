# AI Marketing Automation

This repository implements a governed customer-operations journey from encrypted source sync through lead ownership, consent and suppression policy, campaign approval, durable delivery, verified provider receipts, conversion attribution, and data-quality measurement.

## Runtime boundaries

`./start.sh` starts only the API and frontend. It never installs packages, changes the database, seeds data, rewrites environment files, or kills unrelated processes. Run database deployment and the two workers as explicit operational steps:

```sh
npm --prefix backend run db:deploy
npm --prefix backend run worker:source-sync
npm --prefix backend run worker:delivery
```

Copy `.env.example` into your secret manager or local untracked environment. `JWT_SECRET` must contain at least 32 non-placeholder bytes. `CONNECTOR_ENCRYPTION_KEY` must decode to exactly 32 bytes. Connector endpoints require HTTPS and may be restricted with `CONNECTOR_HOST_ALLOWLIST`.

The checked-in migration is an initial schema for a new database. To adopt Prisma migrations for an existing database, review the generated SQL against that database and follow Prisma's baseline workflow; do not blindly apply an initial migration over existing tables.

## Governed workflow

1. An administrator creates an encrypted `CRM`, `EMAIL`, `CALENDAR`, `ENRICHMENT`, `CONSENT`, or `SUPPRESSION` source at `/api/source-connections` and verifies the real HTTPS contract.
2. A caller queues an idempotent sync run with `Idempotency-Key`. The source worker claims it with a database lease, pulls cursor pages, deduplicates canonical email identities, records provenance and deletions, and pushes changed records for push/bidirectional connections.
3. Consent events, suppressions, explicit lead transitions, owner handoff, approvals, conversions, and attribution are recorded under `/api/governance`.
4. Sending a campaign evaluates opt-out, consent, regional privacy, domain authentication, reputation, frequency, quiet-hours, rate-limit, and human-review policy. It creates durable jobs but performs no provider I/O in the HTTP request.
5. The delivery worker records `SENT` only when SMTP or Twilio returns a provider message ID. It never simulates delivery. `DELIVERED`, bounce, complaint, unsubscribe, open, and click state comes only from signature-verified, idempotent callbacks.

External CRM/provider accounts, verified domains, callback registration, privacy/legal review, and production monitoring remain deployment gates; the repository does not claim those external approvals.

## Verification

```sh
npm --prefix backend ci
DATABASE_URL=postgresql://... npm --prefix backend run db:validate
DATABASE_URL=postgresql://... npm --prefix backend run db:generate
npm --prefix backend test
npm --prefix backend run build
npm --prefix frontend ci
npm --prefix frontend run build
```

