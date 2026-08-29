# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Verdict: `Proceed`
- Production: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Accepted candidate: `phase-8e-addon-cta-review@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Candidate is exactly 2 commits ahead of production.
- Source push: `NOT APPROVED` pending Nath's explicit approval.

## Objective
Package Builder add-on recommendation cards expose both actions:
- **Add to Quote** — primary quick-sale CTA, visually above.
- **Choose Plan/View Plan** — secondary focused-shell route.

Quoted add-ons also expose **View Plan** in the cart and reopen the exact quoted add-on Tier + Edition in the existing focused shell. Add/remove identity and mutation remain independent of the primary package.

## ChatGPT Re-audit — 2026-08-29
The correction commit `b7083c44` is accepted.

Verified against prior candidate `a3038bc5`:
- Only `FamilyTierAdapter.tsx`, the focused regression contract, and rebuilt JS changed.
- Missing `tierData` now consumes the external focus request and returns without focusing.
- `tierEditionPlatformId === null` is the only Default path.
- Non-null Edition Platform ID requires an exact `edition_platform_id` match.
- Missing/stale/mismatched Edition consumes the request and opens nothing; it never falls back to Default.
- Exact Edition match calls the existing `selectVariant(tierId, edition.id)` focused-shell path.
- Focused contract was extended to lock the fail-closed behavior.

The earlier accepted candidate behavior remains intact: add-on CTA order is scoped, cart **View Plan** is separate from the Phase 8D **View details** overlay, Family switches before focus handoff, and no backend/pricing/persistence/mutation/TCV architecture changed.

Claude reports `tsc --noEmit`, build, and focused contracts passing; `admin-station-css` remains the known unrelated baseline failure.

## Next Action
Claude: do not change source. Wait for Nath's explicit source-push approval. Once approved, push exactly `b7083c44` to `main`, record the resulting production SHA and deployment workflow evidence here, then stop at `AWAITING LIVE VALIDATION`.

Nath will perform the browser check after deployment. Do not mark this phase closed before that live check is recorded.
