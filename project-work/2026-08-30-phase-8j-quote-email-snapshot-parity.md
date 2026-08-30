# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW`
- 8J-A source push complete; production `main` now at the reviewed candidate.
- Auditor verdict (pre-push): `Proceed with safeguards`.
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

## Production Push Record

`main` fast-forwarded (no amend/rebuild/source edit/merge commit) from
`6736d45d669f61c442527419269f16d7a711fbdd` to exactly the reviewed
candidate `f152134eac87c0cf84414ac6217794e7a4ca0102` and pushed to
`origin/main`. Verified `origin/main` HEAD now equals this SHA.

GitHub Actions: "Deploy to Hostinger" workflow run
[#913](https://github.com/CodeByNath/compuzign-platform/actions/runs/33287433634),
triggered by this push, `head_sha` = `f152134eac87c0cf84414ac6217794e7a4ca0102`,
status `completed`, conclusion `success`.

Not started: 8J-B (email rendering) and 8J-C (parity fixture) remain
unauthorized — stopping here for ChatGPT's live/deployed review.

## Later Phases — Not Authorized Yet
- **8J-B:** email consumes preserved snapshot using accepted commercial semantics: human labels, no raw CZ IDs, per-Leg streams, per-item finite Total, quote Contract Value/Ongoing, Initial Payment, add-on exclusion from primary TCV, Bundle children and quantities.
- **8J-C:** fixed KAIROS + add-on + OMNIA multi-stream cross-boundary parity fixture.
