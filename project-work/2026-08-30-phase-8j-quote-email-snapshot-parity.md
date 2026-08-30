# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING LIVE VALIDATION`
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`.
- Auditor verdict: `Proceed with safeguards`.
- Phase 8I remains the accepted cart/review/proposal reference; not reopened.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry** unchanged.

Existing flow stays intact: the same submitted quote payload feeds the existing admin notification and customer email builders. 8J only wires the richer Family snapshot already established by the accepted cart/review/PDF work into that existing notification path. Do not invent a new quote engine, identity model, persistence model, resolver, or commercial rule.

## Phase 8J-A — Accepted
`main@f152134eac87c0cf84414ac6217794e7a4ca0102`; Hostinger workflow #913 succeeded. RequestSchema preserves the Family snapshot fields used by final quote surfaces.

## Phase 8J-B — Accepted Source + Deployment
Review candidate `c8a0f2b43b94631232fa5befcb2b1d679f295a9b` was approved after source-first parity audit against `OrderSummary.tsx` and `QuoteProposalPreview.tsx`. The earlier auditor objection about add-on-triggered multi-stream mode was withdrawn because the candidate mirrors the already-accepted Phase 8I behavior exactly.

Independent post-push verification confirms:
- `main` is exactly `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`, direct child of accepted 8J-A `f152134e...`;
- GitHub Actions `Deploy to Hostinger` run #914 (`33288796799`) completed successfully with `head_sha=c8a0f2b...`;
- deployed source now contains the reviewed Family-aware admin/customer email rendering path.

## Live Validation Required
Do not close 8J until a real submitted quote/customer email is checked against the accepted cart/PDF representation. Because submitting a quote creates runtime/transient/mail state, ChatGPT must not generate a live test submission without Nath explicitly authorizing that exact runtime action. Acceptable evidence is either:
- Nath submits a representative live quote and supplies/opens the resulting customer email for read-only audit; or
- Nath explicitly authorizes ChatGPT to submit one representative live quote for validation.

Validate at minimum: Family/Tier/Edition human labels, separate Leg streams, per-item Total where finite, Contract Value/Ongoing + Initial Payment parity, Bundle/inclusion quantities, add-on presentation, no raw CZ IDs in customer email, and admin identity retained where applicable.

## Next-Work Context — CRM Station
After 8J closes, next work should start **small**, not as a full CRM build: establish the CRM as a Station and add **email management only** first. Later capabilities may add quote management, promotion management and subscriptions in separate audited phases with proper durable CRM-owned storage. Do not prematurely merge those later capabilities into the first CRM phase, and do not treat the current 7-day quote transient as future CRM durable storage.

## Phase 8J-C
Live/cross-boundary validation only. No new source architecture or feature work is authorized here.
