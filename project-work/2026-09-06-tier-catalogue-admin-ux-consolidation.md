# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — final Customer Selection Rules UI cleanup, confirmed**
- Production `main`: `9d4948a5db18b9a1c78f21d134ea1432ed3c76e6` (deploy #969 success).
- Candidate branch: `review/tier-catalogue-customer-selection-rules-ui-cleanup`, single commit `bd0a48d8be81c591e48ebe220dda21645b349089`, one clean commit from current `main` (merge-base confirmed identical to `main` HEAD, no rebase needed).

## Confirmation performed this round
Re-audited `bd0a48d8` against the "Superseded idea" note before re-verifying: the commit contains **no** Group-label code, type, sanitizer, editor field, projection, or storage — none was ever written (only a read-only audit of the persistence chain was produced and discarded once the requirement was cancelled). The commit is exactly the three-item UI cleanup, nothing more:
1. Customer Selection Rules **Edit** removed completely, including for Default (`TierComposableMiddleShell.tsx`, `PackageTierWorkspace.tsx` — button, prop, and dispatch function all deleted).
2. Doubled tab underline fixed — traced to a redundant `border-top` on `.cz-tier-workspace__composable-metrics` also causing symptom 3; removed, single shared `StationTabSet` underline remains.
3. Separator above the first metric row (`Always included`) removed; the `> * + *` between-row divider rule (later metric rows) is untouched.
4. Declaration tab filtering/data projection unaffected — not touched by this commit; the separate scope-tab refresh fix landed already on `main` (`9d4948a5`, deploy #969) prior to this round.

Naming is unchanged: Default scope label is still the literal `Default`; Edition scope labels still use the existing Edition `title`.

## Validation re-run this round (against current `main`, on `review/tier-catalogue-customer-selection-rules-ui-cleanup`)
- `git merge-base origin/main origin/review/tier-catalogue-customer-selection-rules-ui-cleanup` == `origin/main` HEAD — branch is exactly one commit ahead, no drift, no rebase required.
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS.
- `npx tsx scripts/tier-catalogue-overview-presentation-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-admin-contract.ts` — PASS.
- `npx tsx scripts/composable-tier-admin-ux-contract.ts` — PASS.
- `npx tsx scripts/tier-overview-is-addon-contract.ts` — PASS.
- `npm run docs:check` — PASS (117 Markdown files, 46 Code Maps, 22 numbered history records).
- `npm run build` — succeeded; output byte-identical to what's already committed on the branch (`git status` clean after build), confirming the committed `dist/` assets are current for this exact source tree.

## Must not change
No routing/edit architecture changes, no Edition deep-link restoration, no CZT/CZTE/CZTC/CZTEC identity changes, no persistence schema changes, no pricing/resolver, lifecycle, customer-policy, quote/cart, or customer-facing changes. Do not touch the separate Always-included initial-cart hydration defect or unrelated lifecycle-regression-script failures.

## Claude — next action
None pending. Awaiting ChatGPT review of `bd0a48d8`. On approval, hand Nath the exact `git push origin bd0a48d8...:main` fast-forward command (push-to-main is classifier-blocked for Claude) and proceed to live validation once he confirms the push landed and the deploy succeeds.
