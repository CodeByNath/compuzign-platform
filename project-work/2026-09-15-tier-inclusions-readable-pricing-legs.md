# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **CLOSED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Production `main`: `d7fa41c83bed398c26d4be9e1304cd22ea650265`
- Deployment: GitHub Actions `Deploy to Hostinger` run #1037 — **Success**

## Phase 1 — Default Tier
**LIVE PASSED by Nath — 2026-09-15.**

Accepted behaviour:
- single effective Leg: inclusion label + unit price/per, `QTY` + total, no Leg label;
- multiple effective Legs: one inclusion header, then sequential `Leg 1`, `Leg 2...`;
- each row uses that Leg assignment's own Price Option, quantity and derived line total;
- no merging/summing or duration multiplication;
- existing inclusion editor/save/discard/lifecycle preserved.

## Phase 2 — Tier Edition Inclusions
**LIVE PASSED by Nath — 2026-09-15.**

Independent review had already accepted candidate `d7fa41c83bed398c26d4be9e1304cd22ea650265`. GitHub now confirms `main` is exactly that SHA and deployment run #1037 completed successfully.

Accepted Edition behaviour:
- same readable priced Inclusion treatment as Default Tier;
- Edition uses its own Rate Sheet, selected rows and CZTEL Legs, never parent Tier pricing;
- single effective Leg remains unlabelled;
- multiple effective Legs use sequential read labels;
- each Additional Leg uses its own Price Option and quantity;
- unresolved selected Edition inclusions remain visible as `Pricing unavailable` rather than disappearing;
- Bundle rows remain valid; FAQ rows are excluded;
- Edition's consolidated module, `TierEditionEditor`, Edit routing, CZTE/CZTEL identity, lifecycle, persistence and backend pricing remain unchanged.

## Closure
Architecture, pushed source, production `main`, successful deployment and Nath's live WordPress validation agree for both Default Tier and Tier Edition Inclusions. This work is accepted and closed.

The separate presentation idea discussed after validation — changing unit-price copy from `$25.00 Per VM` to `Per VM · $25.00` — is **not part of this closed work and has not been authorized or implemented**. Treat it as a separate presentation refinement only if Nath explicitly approves it later.

Branch cleanup remains a Builder/user repository-hygiene action; the Reviewer does not delete or manipulate branches.

## Builder housekeeping — 2026-09-15
- `tier-inclusions-readable-pricing-legs` was confirmed to be an ancestor of `main` `d7fa41c8`, then deleted locally and on the remote. The repository is back to exactly `main` + `Project-work-instructions`; local `main` is synced to `d7fa41c8`; the working tree is clean, with no stashes or extra worktrees.
- Other work files that are not closed (left untouched; status changes belong to the Reviewer/Nath):
  - `2026-09-15-package-home-family-dropdown-browser-visibility.md` is still **AWAITING LIVE VALIDATION** (main `cd86c943`, run #1035), with no recorded live result. Its code is contained in current `main`.
  - `2026-08-30-quote-email-billed-item-separators.md` is still on legacy **AWAITING CHATGPT REVIEW**, and its review branch was removed on 2026-09-09. It needs a close or defer decision.
- No other follow-up was started. The `Per VM · $25.00` copy idea remains unauthorized.
