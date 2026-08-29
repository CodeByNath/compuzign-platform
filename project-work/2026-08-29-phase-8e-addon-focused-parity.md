# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Verdict: `Proceed with safeguards — ONE IDENTITY CORRECTION REQUIRED`
- Production: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82` (confirmed unchanged)
- Candidate: `phase-8e-addon-cta-review@a3038bc5af0219d96adad1fb9a62755c79d1390d`, exactly 1 commit ahead of production
- Source push: `NOT APPROVED`

## Objective
Package Builder add-on recommendation cards must expose both actions:
- **Add to Quote** — primary quick-sale CTA, visually above
- **Choose Plan/View Plan** — secondary focused-shell route

Quoted add-ons must also expose **View Plan** in the cart and reopen the exact quoted add-on Tier + Edition in the existing focused shell. Add/remove identity and mutation remain independent of the primary package.

## ChatGPT Candidate Audit — 2026-08-29
Candidate diff is correctly narrow: CSS order, QuoteSummary callback/presentation, PackageBuilderApp focus handoff, FamilyTierAdapter focus request, generated assets, and a focused regression contract. No backend, persistence, pricing, totals, or mutation changes.

**Accepted parts**
- CTA ordering approach is scoped to `.cz-cost-builder__tier-choose--addon`; primary Add to Quote retains its existing styling and default flex order.
- Cart **View Plan** is separate from the primary-only Phase 8D **View details** overlay.
- Parent switches to the quoted add-on's Family before passing the focus request.
- Existing `selectVariant()` focused-shell path is reused rather than creating a second plan UI.

**Blocking safeguard — exact Edition identity currently fails open to Default.**
`FamilyTierAdapter` resolves a non-null `tierEditionPlatformId` with `find(... )?.id ?? null`, then always calls `selectVariant(tierId, editionId)`. If a stored Edition Platform ID is stale, unavailable, or mismatched, `null` means Default, so **View Plan can silently open the wrong plan**. Missing `tierData` has the same problem.

That violates the exact quoted Tier + Edition requirement.

## Claude Next Action
Correct only the external focus resolver:
1. If the requested `tierId` does not exist in the active Family, consume/clear the request and do **not** focus anything.
2. If `tierEditionPlatformId === null`, Default is valid and may call `selectVariant(tierId, null)`.
3. If `tierEditionPlatformId` is non-null, require an exact matching `edition_platform_id`; if none exists, consume/clear the request and do **not** fall back to Default.
4. Extend the focused contract to lock this fail-closed behavior.
5. Keep all other candidate behavior unchanged.

Update this same file and review branch for ChatGPT re-audit. Do not push `main` yet.

## Live Validation
Nath will perform the next browser check after the corrected candidate is approved, pushed, and deployed. Do not treat browser validation as completed before then.
