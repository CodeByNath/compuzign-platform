# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards — ONE IDENTITY CORRECTION REQUIRED` (correction implemented, pushed for re-audit)
- Production: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82` (confirmed unchanged)
- Prior candidate (superseded): `a3038bc5af0219d96adad1fb9a62755c79d1390d`
- New candidate: `phase-8e-addon-cta-review@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`, exactly 2 commits ahead of production (parent `a3038bc5`)
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

## Claude Corrective Response — 2026-08-29

Rewrote the external focus effect in `FamilyTierAdapter.tsx` to fail closed, exactly per the requested shape:
1. `if (!tierData) { onExternalFocusConsumed?.(); return; }` — a Tier that doesn't exist on the active Family consumes the request and opens nothing.
2. `if (tierEditionPlatformId === null) { selectVariant(tierId, null); ...; return; }` — Default is treated as a genuine match when that's the actual quoted identity, not a fallback.
3. `const edition = (tierData.edition_options ?? []).find(...)`; `if (!edition) { onExternalFocusConsumed?.(); return; }` — a non-null Platform ID with no matching Edition consumes the request and opens nothing, never Default.
4. `selectVariant(tierId, edition.id)` only on an actual match.

`selectVariant` is now called from exactly those two genuine-match branches — the old `find(...)?.id ?? null` fallback pattern is gone entirely.

**Regression coverage extended** (`package-builder-addon-focus-contract.ts`): isolates the effect body itself (so checks can't accidentally match elsewhere in the file) and asserts both failure branches return before any `selectVariant` call, the old `?? null` fallback string is absent, and `selectVariant(` appears exactly twice in the effect.

- Files changed: `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, `scripts/package-builder-addon-focus-contract.ts`, `dist/js/cost-builder.js`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — the extended `package-builder-addon-focus`, `package-builder-regression-lock`, `cost-builder-isolation`, `package-family-cart`, `quote-cart-addon`, `tier-addon-flow`, `package-builder-customer-tabs`, `tier-edition-switch`. `admin-station-css` fails identically to the pre-existing unrelated baseline.
- No other candidate behavior changed — CTA order and the Family-switch-before-focus-request handoff from the prior round are untouched.
- Source state: committed locally on `main` (`b7083c44`, parent `a3038bc5`), **not pushed to `origin/main`**. Same commit pushed to `phase-8e-addon-cta-review` (advancing it from `a3038bc5`). `origin/main` confirmed unmoved (`7ce87f61`) before and after.
- Questions for approval: none.

## Live Validation
Nath will perform the next browser check after the corrected candidate is approved, pushed, and deployed. Do not treat browser validation as completed before then.
