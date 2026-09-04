# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict (prior round): **Proceed with safeguards**
- `main` pushed and deployed: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3` (fast-forward from `528f7295`, exactly the approved review head — no unrelated commits included)
- Deployment evidence: GitHub Actions **Deploy to Hostinger**, run `33858741201` (`#944`), `head_sha=eaead453...`, `status=completed`, `conclusion=success`, started `2026-09-04T09:31:08Z`, finished `2026-09-04T09:36:17Z`
- Live regression date: 2026-09-04

## Accepted architecture / non-change boundary
- Finalise produces exactly one Build Your Own item with authoritative peer `composedBase` + `composedUpgrade`.
- Top-level fields remain deterministic projections of those peers; count every charge once.
- Do not restore a standalone base, change Rate Sheets/schema ownership/pricing facts, or alter unrelated customer/admin behavior.
- Attached optional add-ons are intentionally removed when the primary build is finalised.

## Browser regression already recorded
KAIROS — IaaS / Starter Cloud + Block Storage upgrade + temporary Backup & DR Shield:
- Finalise gating, Updating state, unfinished-draft Review block, one-item final representation, and add-on removal passed.
- After Finalise, production incorrectly showed only the $10/month upgrade; Starter Cloud inclusions and $156.50/month + $80/year streams disappeared; Quote Details lacked Base/Upgrades grouping.
- Request/email validation stopped at that gate.

## Auditor review of Claude fix
Actual net diff `528f7295..eaead453` reviewed: `ComposableOfferBrowser.tsx`, `QuoteDetailsOverlay.tsx`, cost-builder CSS + compiled assets, and two regression contracts.

**Finding:** Claude's root cause is consistent with the live failure. The debounced composable auto-commit effect re-ran when Finalise removed the primary and flipped context/primaryItem, then overwrote the correct final composed line with a stale standalone upgrade-only snapshot. The new `shouldAutoCommitComposableSelection()` guard stops that effect once `initialCartItem.isComposedUpgrade` is true. This preserves the existing `finaliseUpgradeQuoteDraft()` / `deriveComposedProjection()` ownership rather than creating a second pricing path.

Quote Details grouping is also acceptable: it reads the existing `provenance` already stamped by `deriveComposedProjection()` and does not invent new composition logic.

Regression evidence covers the exact scenario: base $156.50/month + $80/year, upgrade $10/month, both peers retained, one final item, add-on removed, combined $166.50/month + $80/year projection; stale-finalise guard remains covered. Claude reports `contract:upgrade-quote-draft`, `contract:composable-finalise-race`, `tsc --noEmit`, and build passing. Review head has no GitHub status checks attached.

## Next action
Pushed and deployed per Status above (`main` fast-forwarded by the user after auditor approval; Claude verified the exact SHA and the Hostinger run). Auditor/browser agent to re-run the same KAIROS — IaaS scenario (Starter Cloud + Block Storage upgrade + temporary Backup & DR Shield) against `main@eaead453` and confirm: base + upgrade inclusions/streams both present, combined $166.50/month + $80/year totals, Quote Details Base/Upgrades grouping, add-on removal, and stable state after reload. Request/email work stays paused until this passes.