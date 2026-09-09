# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `ee624fdc6d71e9499396097b872afd3bee97b26f` (unchanged).
- Review branch: `fix/quoted-single-tier-dismissible` @
  `6086f9e5b2f6e6e0be2a270c5367fb278242d64b` — 1 ahead, 0 behind, merge base
  `ee624fdc`. **Not pushed to `main`.**
- Previous work item closed: topic branch deleted after confirming it was an
  ancestor of `main`. Repository back to `main` + coordination + 1 topic.
- `Deploy to Hostinger` run id not recorded: `gh` is not installed in my
  environment, so I could not query Actions. Nath's live confirmation stands as
  the deployment evidence for `ee624fdc`.

## Live result — previous defect accepted
Nath confirmed the deployed single-primary landing now behaves correctly: a one-primary customer group lands directly in the real focused shell, and empty customer-group tabs are no longer shown. Treat the Family-membership correction as accepted; do not reopen it without hard evidence.

## New refinement — Nath approved
When a customer group has exactly one normal Tier:

1. **Before that Tier is in Cart**
   - keep the current automatic focused landing;
   - no Close/X button;
   - no one-card grid fallback.

2. **Once that exact Tier is the selected primary in Cart**
   - the focused shell remains available;
   - show the normal sticky **X** Close button;
   - clicking X must exit focused mode and reveal the single Tier as its normal customer-group card while the Cart remains visible beside it;
   - the quoted card keeps the existing quoted-state CTA (`View Plan`) and can reopen the focused shell;
   - reopening must show the same exact quoted Default/Edition identity.

3. **If the Tier is removed from Cart**
   - restore the original single-Tier landing rule: automatic focused shell, no X.

## Architectural direction
Do not make `normalTiers.length === 1` permanently undismissable once that Tier is quoted. Distinguish:
- **locked implicit single-Tier landing** = exactly one real primary + not quoted;
- **quoted single-Tier focused view** = exactly one real primary + selected primary exists; dismissible with X.

The X must not immediately re-trigger the render-time single-Tier fallback. Use explicit, local presentation state/derivation tied to the quoted single-Tier case so a customer dismissal persists while that same Tier remains quoted. Reset that dismissal when the primary is removed, Family/customer group changes, or a different Tier becomes selected. Do not use fake clicks, timers, route changes, or CSS-only hiding.

## Must preserve
Family-membership fix, audience/tab rules, exact Tier+Edition identity, existing focused shell, sticky X behavior, Add-ons, Recommendations, Upgrade/composable journey, Cart, pricing/server preview authority, quote snapshots and current `View Plan` routing.

## Must not substitute
No extra customer step, no one-card landing before quote, no duplicated focused shell, no hardcoded Family/Tier ids, no effect-driven artificial auto-open, no cart suppression after X.

## Claude — next action
Implement only this refinement from current `main`. Add/adjust a mounted regression covering: unquoted single Tier auto-focused/no X; quoted single Tier focused with X; X => one quoted card + Cart-visible state signal; `View Plan` reopens exact quoted Edition; removing primary restores auto-focus/no X. Push to the single topic branch, record changed files/tests/SHA here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Claude — implementation (round 1 of this refinement)
Two states now distinguished in `FamilyTierAdapter.tsx`, by whether the single
Tier is the selected primary:

- `isLockedSingleTierLanding` — one real primary, **not** quoted: auto-focus, no
  X, unchanged from today.
- quoted single-Tier view — that Tier **is** the primary: focused shell keeps the
  ordinary sticky X.

Because the shell comes from a render-time fallback, clearing `focusedTierId`
alone would let the next render re-derive it and reopen — X would look broken.
The dismissal is recorded as `singleTierDismissedTierId` (the same
validity-scoped shape `stagedTierId`/`upgradeGateTierId` already use) and
honoured **at the fallback itself**. It expires by derivation when the primary is
removed or swapped, and is cleared outright on Family switch and on an explicit
customer-group change. The fallback stays a passive render-time derivation — no
effect-driven auto-open, fake click, timer, route change, or CSS-only hiding.

Dismissing lands on the Tier's own normal card, which keeps its quoted state and
its `View Plan` route back into the shell on the exact quoted Default/Edition
identity (`PricingTiers.tsx` already passes the quoted Edition — unchanged). The
shell reports itself inactive on dismissal, so the Cart stays visible.

**Files:** `FamilyTierAdapter.tsx`, `dist/js/cost-builder.js` (rebuilt),
`package.json` (one script entry), `scripts/quoted-single-tier-dismissible-regression.mjs`
(new), `docs/code-map/package-builder-focused-shell.md` (see below).

**Verify**
```
npm run regression:quoted-single-tier-dismissible    # 22/22
npm run regression:family-tier-membership-boundary   # still green
npx tsc --noEmit ; npm run build ; npm run docs:check
```
Contracts re-run and passing: package-builder-customer-tabs, -regression-lock,
-addon-focus, tier-edition-switch, manage-build, composable-quote-cart,
composable-recommendations-cta, composable-offer-eligibility, package-family-cart,
quote-cart-addon, package-builder-bundle-inclusion-parity,
plan-details-value-states, tier-addon-flow.

**Reproduction evidence.** Against the pre-change tree the new regression fails
10 checks — no X while quoted, X bouncing straight back into the shell, and
`shellActive` staying `true` (Cart suppressed after X).

### My own regression on `main`, now fixed — please note
`docs:check` was **failing on `main`**. Last round's Code Map correction took
`package-builder-focused-shell.md` from 598 to **617 prose words**, over the
600-word limit. I reported that check as passing because my shell captured
`tail`'s exit code instead of npm's — the check was red, not green. This commit
tightens the same paragraph back to **598 words** with the corrected meaning
intact, and `docs:check` now exits 0 (verified directly). Flagging it rather than
burying it: a red check reached `main` on my report.

### Behaviour pinned, not changed
`commitSelection()` clears `focusedEditionId`, so immediately after Add to Quote
the shell re-derives on the Tier **Default** even though the Cart holds the
Edition. That is pre-existing and outside this scope; the regression asserts it
as-is so it cannot drift silently. Say if it should change — the quoted card and
`View Plan` reopen both carry the exact Edition, so only that one transient view
shows Default.

Live behaviour unverified by me — no live access.
