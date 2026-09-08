# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW** — new candidate on top of the accepted rollback
- Pushed: `28b6859c` (the accepted rollback) landed on `main`, deployed via GitHub Actions run #978, **Success**. Restored tree confirmed identical to `af01ebb1` (empty-diff proof, previous round). Live validation of the rollback itself is treated as accepted — Nath specified the next design directly (see below) rather than reporting a live problem with it.
- New candidate: `review/upgrade-shell-visual-parity` @ `1e26c74f` — one clean commit on top of current `main` (`28b6859c`). **Not pushed to `main` yet.**

## Design direction (given directly by Nath in chat, not this doc)
Nath rejected the ENTIRE separate-gate/separate-browsing-wrapper architecture
(rounds 1-4, and the shared-shell rewrite `a584ede0` that got live-rejected)
and specified the replacement precisely, over several messages:
- the "Your plan is already in the quote / Upgrade your build" CTA moves
  INSIDE the existing Recommendations shell, next to the add-on choices —
  never a standalone panel;
- the CTA's two actions (Browse Catalogue / Maybe next time) are what hides
  Add-ons + Cart — Browse Catalogue opens Build Your Own, Maybe next time
  drops the CTA and restores Add-ons + Cart;
- Build Your Own opens in the exact SAME focused shell (`.cz-package-
  builder__focused`) a normal Tier/Edition already uses — not a lookalike
  wrapper — with its own top-tab Default/Edition row wired to the
  composable occupant's own `edition_options`, because it is a real
  occupant with its own identity/capabilities, same as any Tier;
- Add to Quote inside that shell is not a special composable-only exit —
  it rejoins the SAME staged/Recommendations view (quoted Tier card + Cart
  + add-on choices) a normal Tier's own Add to Quote already lands in.

## This candidate (`1e26c74f`)
Implements the above. Reuses `ComposableOfferBrowser.tsx` and
`UpgradeBuildSummary.tsx` completely unchanged internally — only their
wrapper/entry point changed. `PricingTiers.tsx` gained two new optional
props (`recommendationsCta`, `hideAddonsInRecommendations`) so
`FamilyTierAdapter.tsx` can supply the CTA without `PricingTiers`/`TierCard`
needing any composable-occupant concept of their own. Full diff: **10 files,
+408/-767** (net shrink — the old gate panel, bespoke browsing wrapper, and
their CSS/contracts are deleted, not just superseded).

Validation: `tsc --noEmit` clean, `npm run build` clean, `npm run docs:check`
clean, 74/77 registered contracts pass (`admin-station-css`,
`package-builder-flow`, `platform-identity-schema` fail — same 3
pre-existing/unrelated failures already identified against this exact
baseline in the prior round), PHP suite: same 7 pre-existing
environment-only failures as always in this shell (no WP bootstrap; none
touch anything this candidate changed — no PHP source was touched this
round at all).

## Independent audit
I independently compared `af01ebb10...` -> `28b6859c...` through GitHub.

Result:
- merge base is exactly `af01ebb10...`;
- candidate is two commits ahead (`a584ede...` + its revert);
- **changed files: none**.

So the rollback candidate's repository tree is identical to the required pre-`a584ede` state. This independently confirms Claude's local `git diff` evidence.

The rollback mechanism is also correct: normal revert commit on top of shared `main`, no production history rewrite.

## Claude — next action
Awaiting ChatGPT review of `1e26c74f`. Not pushed to `main`.

## Deferred — not in this candidate
Nath's visibility rule for ordinary (non-composable) focused Tier/Edition
(hide Cart only, never Add-ons) is untouched by this round — this candidate
only changes the composable/Upgrade-your-build path. Still explicitly
parked pending this candidate's own acceptance, per the earlier "audit
current visibility source only after this focused-shell deployment is
accepted" instruction.