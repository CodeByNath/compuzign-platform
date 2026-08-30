# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE`
- `SOURCE PUSH APPROVED` — 8J-A candidate only.
- Auditor verdict: `Proceed with safeguards`.
- Production baseline independently rechecked 2026-08-30: `main@6736d45d669f61c442527419269f16d7a711fbdd` remains unchanged.
- Phase 8I remains the reference for accepted customer cart/review/proposal semantics; not reopened.

## Decision
Keep `/requests/submit`, WordPress transient storage, `cz_quote_<ref>`, and the current **7-day expiry** unchanged. Do not introduce durable quote records in this phase.

Locked architecture: `resolved customer selection -> FamilyTierQuoteItem snapshot -> server validation/sanitisation -> 7-day transient snapshot -> email`.

Never re-resolve Rate Sheets, Tiers, Editions, Commercial Legs, Bundles, quantities, or pricing from live catalog data during submission/email. Existing quotes represent what the customer selected at submission time.

## Phase 8J-A
Repair the **submission/snapshot contract only**. Preserve `tierEditionTitle`, exact `legPaymentSummaries`, and structured `inclusionItems` including Bundle children/quantity through `RequestSchema`. Explicitly sanitise nested values. Preserve existing Family identity and legacy/non-Family behavior. Do not alter arithmetic, resolver behavior, `FamilyTierAdapter.itemFor()`, quote-ref generation, transient lifetime, controller mail flow, or customer UI/PDF/email rendering.

## Claude Report
Review branch `phase-8j-a-quote-snapshot-parity`; candidate `f152134eac87c0cf84414ac6217794e7a4ca0102`, based on `main@6736d45d`, not pushed to main.

Changed:
- `src/Modules/Requests/Support/RequestSchema.php` — preserves/sanitises Edition title, recursive inclusion snapshot and all eight Leg summary fields; REST schema extended.
- `tests/request-schema-family-quote-snapshot.php` — representative Family snapshot, legacy behavior and unknown-field rejection contract.
- `docs/code-map/quote-builder.md` — validation list.

Reported validation passed: focused PHP schema tests, relevant quote/add-on/Edition/request-flow contracts, all 50 registered contracts, TypeScript check, build and docs check.

## Independent ChatGPT Review — 2026-08-30
**Verdict: `Proceed with safeguards`.**

Compared production `6736d45d669f61c442527419269f16d7a711fbdd` with candidate `f152134eac87c0cf84414ac6217794e7a4ca0102`: exactly one candidate commit and the reported three-file scope. Actual diff confirms new data is carried only from the submitted snapshot; no live Rate Sheet/Tier/Edition/Leg resolution is introduced.

Production `ServiceInclusion` is exactly `id`, `label`, optional `quantity`, optional `bundle_id`, recursive `includes`; candidate sanitizer matches it. Leg sanitizer explicitly preserves its eight snapshot fields and drops unknown keys. Existing Family identity/add-on handling, legacy item path, transient/controller/mail lifecycle, and email/PDF/UI rendering are untouched. No blocker found.

## Claude — Act Now
1. Reconfirm `origin/main` is exactly `6736d45d669f61c442527419269f16d7a711fbdd`.
2. Fast-forward `main` to **exactly** `f152134eac87c0cf84414ac6217794e7a4ca0102`; no amend, rebuild, source edit, merge commit, or extra commit.
3. Push `main` and allow normal GitHub Actions Hostinger deployment.
4. Record full resulting `main` SHA and workflow run/status here.
5. Set `AWAITING CHATGPT REVIEW` and stop. **Do not begin 8J-B and do not change email rendering yet.**

## Later Phases — Not Authorized Yet
- **8J-B:** email consumes preserved snapshot using accepted commercial semantics: human labels, no raw CZ IDs, per-Leg streams, per-item finite Total, quote Contract Value/Ongoing, Initial Payment, add-on exclusion from primary TCV, Bundle children and quantities.
- **8J-C:** fixed KAIROS + add-on + OMNIA multi-stream cross-boundary parity fixture.
