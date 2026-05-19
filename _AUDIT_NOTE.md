# Audit Note — aIMarketingAutomation

Source audit: `_AUDIT/reports/batch_05.md` § 14 (verdict: **substantive**, 58 AI endpoints, Prisma + TypeScript)

## Original audit recommendations

### Missing AI endpoints
- `/customer-lifetime-value`
- `/churn-risk`
- `/product-recommendation`

### Missing non-AI features
- Mobile app (out of backend scope)
- GDPR / CAN-SPAM compliance enforcement
- Lead scoring model management
- Multi-language campaigns
- Native SMS/MMS
- Payment integration

### Custom feature suggestions
- Agentic campaign orchestration
- Real-time personalization engine
- Autonomous creative testing
- Multi-channel journey agent
- Predictive lifecycle management
- Marketplace integrations (Shopify, WooCommerce)

## Implemented in this pass
**Backlog-only.** This project is the most mature in the batch (TypeScript, Prisma, 58 AI endpoints, 25 frontend pages). New endpoints would require:
- Prisma schema migrations for CLV/churn fields (NEEDS-PRODUCT-DECISION on which signals to model)
- TypeScript types matching the existing `routes/ai.ts` patterns
- Coordination with the existing `personas`, `attributions`, `fatigues` flows to avoid overlap

Adding 3 mechanical endpoints here without inspecting the existing 61 routers risks duplication or conflicting field semantics, so per the audit-apply policy ("substantive projects all-non-mechanical → backlog-only") no code changes are made.

## Backlog (priority order)

### Mechanical (after schema review)
- `/customer-lifetime-value` (likely needs `Contact.purchases` or order history join)
- `/churn-risk` (overlap risk with existing `/fatigues/detect`)
- `/product-recommendation` (needs catalog model — currently absent from Prisma schema scan)

### Needs creds / external SDK
- SMS/MMS (Twilio)
- Payment integration (Stripe)
- Shopify/WooCommerce marketplace APIs

### Needs product decision
- Mobile app (frontend scope)
- GDPR/CAN-SPAM enforcement model (consent state machine, suppression list)
- Lead scoring DSL (current `segments/build` may already serve this; needs PM call)
- Multi-language campaign data model

## Apply pass 3 (frontend)
- **Action:** LEFT-AS-IS. FE already fully wired.
- `frontend/src/services/api.ts` defines `aiAPI` with 50+ methods covering every `routes/ai.ts` endpoint. Auth interceptor injects `Authorization: Bearer <token>` from localStorage.
- `pages/AITools.tsx` and `pages/Reviews.tsx` consume `aiAPI`.
- Pass 2 was backlog-only here (no new endpoints added), so no new FE wiring is required.

## Apply pass 4 (mechanical backlog)
- **Action:** LEFT-AS-IS (no mechanical items eligible).
- The three audit-suggested mechanical items (`/customer-lifetime-value`, `/churn-risk`, `/product-recommendation`) all require values in the `AIGenerationType` Prisma enum (`backend/prisma/schema.prisma` lines 589-610), which is the persistence column for every `routes/ai.ts` endpoint via `prisma.aIGeneration.create({ data: { type: ... } })`. Adding endpoints without extending the enum would either persist with the wrong category or skip persistence (drift from existing 58 endpoints' contract).
- Extending the enum requires a Prisma migration → TOO-RISKY per apply-pass-4 rules and explicitly deferred in the Pass 2 note above.
- `churn-risk` also has overlap risk with existing `/fatigues/detect`; `/product-recommendation` requires a catalog model not currently in `schema.prisma`.
- No code changes this pass.
