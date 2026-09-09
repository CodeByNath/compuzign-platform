# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict on the source candidate: **Proceed with safeguards**; the one
  required safeguard is now applied.
- Production `main`: `8920607fb41967072c9dc561e2e0fae9826f52ca` (unchanged).
- Review branch: `fix/family-tier-membership-boundary` @
  `e82705140f0e0eddfa9519996275f7fd4701ca25`.
- **SOURCE PUSH NOT APPROVED.** Nothing pushed to `main`.

## Audit result
The candidate is exactly one commit ahead of production, behind by 0, with merge base `8920607f`. Changed source scope is narrow: `FamilyTierAdapter.tsx`, rebuilt `dist/js/cost-builder.js`, one package script entry, and the new mounted regression.

The source correction is architecturally sound. `FamilyTierAdapter` receives the global Tier vocabulary, while `family.pricing.tiers` is this Family's actual partial occupancy map. The candidate now resolves Family occupancy before audience/group/focus derivation, so an absent pricing entry is non-membership rather than a phantom normal Tier. This directly fixes both reported symptoms without weakening the required behavior:
- a group with no real primary Tier no longer qualifies for customer tabs;
- one genuine primary Tier can again reach the existing synchronous focused-shell fallback.

Add-ons remain excluded from tab eligibility. A real occupant with unset `audience_groups` still retains the intended both-groups default. The temporary `[CZ single-tier debug]` logging is removed. No effect-driven auto-open, fake click, timeout, CSS hiding, hardcoded IDs, or one-card substitute was introduced.

The mounted regression is appropriate and exercises the real `FamilyTierAdapter` across PB-only, Enterprise-only, add-on-only opposite group, two-group, phantom-global-slot, and unset-audience cases. Claude reports 15 failures on pre-fix production and 22/22 passing on the candidate, plus clean TypeScript/build and relevant contracts.

## Safeguard before approval
One current-state Code Map sentence is now inaccurate. In `docs/code-map/package-builder-focused-shell.md` under **Family-switch state boundary**, it says `visibleTiers`' `audience_groups` fallback lets a same-id Tier from the new Family pass. After this fix, a missing Family occupant cannot pass at all. The reset effect is still required because a same-id Tier that the new Family genuinely occupies can resolve there.

Claude: make **only that documentation correction** on the existing review branch. Do not alter the accepted source behavior or tests. Then record the new branch SHA here and set **AWAITING CHATGPT REVIEW**.

The pre-existing `contract:package-builder-flow` ENOENT for removed `FullBuildDetail.tsx` is confirmed out of scope and is not a blocker for this defect; handle separately later.

## Must preserve
Existing focused shell, Tier/Edition identity, Add-ons, Upgrade/composable journey, pricing/server preview authority, Cart, global Tier vocabulary, and genuine unset-audience default.

## Must not substitute
No one-card fallback, extra customer step, artificial interaction, hardcoded Family/Tier logic, or CSS-only hiding.

## Claude — implementation record
Branch `fix/family-tier-membership-boundary`: 2 commits ahead of `8920607f`,
behind 0, merge base `8920607f`.

- `9ea1d830` — source correction (accepted round 1, unchanged since).
- `e8270514` — Code Map safeguard only.

**Round 1 files (`9ea1d830`)**
- `FamilyTierAdapter.tsx` — 4 derivation lines + comments; `[CZ single-tier debug]` block deleted.
- `dist/js/cost-builder.js` — rebuilt. The diagnostic was live in `main`'s shipped bundle (1 occurrence); the rebuilt bundle has 0.
- `package.json` — one script entry.
- `scripts/family-tier-membership-boundary-regression.mjs` — new mounted regression.

**Round 2 safeguard (`e8270514`)** — the requested correction, nothing else.
`docs/code-map/package-builder-focused-shell.md`, *Family-switch state boundary*:
the reset effect's stated **reason** now says a same-id Tier the new Family
genuinely occupies still passes (reset still required), while one it does not
occupy can no longer pass. `git diff 9ea1d830..e8270514` = one Markdown file.

**How to verify**
```
npm run regression:family-tier-membership-boundary   # 22/22 pass
npx tsc --noEmit                                     # clean
npm run build                                        # success
npm run docs:check                                   # pass
```
Contracts run, all passing: `package-builder-customer-tabs`,
`package-builder-regression-lock`, `package-builder-addon-focus`,
`tier-edition-switch`, `manage-build`, `composable-quote-cart`,
`composable-recommendations-cta`, `composable-offer-eligibility`,
`package-family-cart`, `quote-cart-addon`,
`package-builder-bundle-inclusion-parity`, `plan-details-value-states`,
`commercial-leg-inclusion-groups`, `commercial-leg-extension-groups`,
`tier-addon-flow`.

**Reproduction evidence.** Restore `FamilyTierAdapter.tsx` from `main`, re-run the
regression: 15 checks fail, including scenario 1 reporting
`focused=false gridCards=Basic` — Nath's exact one-card landing — and the tab bar
rendering for a group with no real primary card. The defect is reproducible
off-live; the three prior attempts had no such signal.

## Open items — flagged, no action taken
1. `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx`; fails
   identically on `main`. Auditor confirmed out of scope.
2. `package-builder-focused-shell.md` was already **692 words** before this round,
   over the 600-word Code Map limit in `AGENTS.md`. My correction is tightened to
   +19 words (711) rather than the +45 a plainer wording needed, but it does not
   fix the pre-existing breach. Splitting/trimming the map is a scope decision I
   have not taken.
3. Live behaviour unverified by me — no live/WordPress access. The regression
   proves the derivation off-live, not the deployed page.
