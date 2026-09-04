# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Claude fix pushed, not merged to main**
- Auditor verdict (prior round): **Stop — architectural risk**
- Base source at time of fix: `main@528f7295fcc8e505cb0d064d01fe8e077f228924`
- Browser validation date: 2026-09-04
- Fix pushed to `review/upgrade-journey-finalisation@eaead453` (reused topic branch per two-branch policy; its prior tip `59d4fba1` is the already-recorded zero-diff reverted self-correction — not cherry-picked, built on top of, net-zero). Source push to `main` NOT yet approved.

## Accepted architecture and non-change boundary
- An exact Tier/Edition base becomes an in-progress composable draft; explicit **Finalise build** produces exactly one Build Your Own item.
- The final item must retain authoritative peer snapshots: `composedBase` for the exact selected Tier/Edition and `composedUpgrade` for committed upgrades.
- Top-level commercial fields are deterministic projections of those peers and must count every charge exactly once.
- Do not restore a standalone base alongside the final Build Your Own item.
- Preserve the intended removal of attached optional add-ons when the primary build is finalised.
- Do not change schema ownership, Rate Sheet definitions, pricing facts, or unrelated customer/admin presentation.

## Live browser evidence
Scenario: KAIROS — IaaS, Starter Cloud, Block Storage upgrade, with Backup & DR Shield temporarily attached.

- **PASS:** Finalise was disabled before an upgrade was selected.
- **PASS:** Immediately after adding Block Storage, the UI showed **Updating…** and Finalise remained disabled.
- **PASS:** Finalise enabled only after the committed preview settled.
- **PASS:** The unfinished draft blocked **Review & Finalise Quote** with “Finalise your build before requesting a quote.”
- **PASS:** Before finalisation, the cart showed Starter Cloud plus an **UPGRADES** section; Block Storage was $10/month ongoing and Initial Payment displayed $167.
- **PASS:** Adding Backup & DR Shield created a separate third add-on, and finalising removed that add-on with the primary cascade.
- **FAIL:** After Finalise, the cart correctly collapsed to one `KAIROS — IaaS / BUILD YOUR OWN` item, but it showed only Monthly $10 and an estimated $10/month total.
- **FAIL:** Quote Details contained only Block Storage quantity 100 and Monthly $10/Ongoing. It omitted the entire Starter Cloud base snapshot (2 vCPU, 8 GB RAM, SUSE Linux, base Block Storage, Backup Storage — BaaS, Static IP Block) and its $156.50 monthly plus $80 yearly payment streams.
- **FAIL:** Quote Details did not present grouped **Base** and **Upgrades** sections.

No raw post IDs, meta keys, hashes, bearer values, or similar plumbing were observed before the stop point. Downstream Request/email validation was not attempted because the authoritative final quote representation already failed.

## Exact fix request for Claude
1. Diagnose the finalise commit/projection path at the stated production SHA. Ensure the one final Build Your Own item retains the exact selected Starter Cloud/Edition snapshot in authoritative `composedBase` and the committed Block Storage change in `composedUpgrade`.
2. Do not flatten or overwrite the base with an upgrade-only preview. Rebuild top-level commercial projections from both peers, counting each inclusion and payment stream exactly once.
3. Make cart summary, contract/initial-payment totals, and Quote Details reflect the combined base and upgrade. Quote Details must visibly group **Base** and **Upgrades** and include all base and upgrade inclusions.
4. For this scenario preserve the source pricing facts: base $156.50/month + $80/year, plus upgrade $10/month. Existing display-rounding conventions may remain, but stored facts and aggregate totals must be exact.
5. Preserve the passing race guard, unfinished-draft Review block, one-item final representation, and intended add-on removal.
6. Add a regression covering: select exact base; attach add-on; add Block Storage; wait for resolved committed preview; finalise; assert one Build Your Own item, add-on gone, base peer present, upgrade peer present, combined projection, grouped details, and stable state after reload. Retain a stale-preview/finalise guard test.
7. Do not submit a fresh Request or email until this browser gate passes.

Report changed files, tests, source commit, coordination commit, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.

## Claude's diagnosis and fix (2026-09-04)

**Not a finaliseUpgradeQuoteDraft()/deriveComposedProjection() bug** — re-verified correct against a new realistic fixture matching this scenario (base $156.50/mo+$80/yr, add-on, upgrade $10/mo ongoing): projection concatenates both peers correctly, sums to $166.50/mo+$80/yr.

**Real cause:** `ComposableOfferBrowser.tsx`'s debounced auto-commit `useEffect` deps on `context`/`primaryItem`. Finalise removes the primary, flipping both (`upgrade_your_build`→`build_your_own`, Tier→`null`) with no new customer edit — that alone re-fires the effect ~400ms later. `hasInteracted`/local `selection` are never reset by this transition, so it re-resolves the stale upgrade-only choice and re-commits a fresh **standalone** snapshot (no `composedBase`/`composedUpgrade`) over the just-finalised item, dropping the base's price/inclusions/streams. Matches every FAIL, including the wrong headline price.

A prior same-symptom self-correction on this branch (`1976e01d`, reverted `59d4fba1`) blamed `itemFor()` never setting `inclusionItems` — re-checked, false (line 648 sets it unconditionally). That revert was correct; this is a different, complete cause covering the price too.

**Fix:** (1) `ComposableOfferBrowser.tsx` — exported pure guard `shouldAutoCommitComposableSelection(initialCartItem)` (false once `isComposedUpgrade`), same precedent as `isFinaliseBuildReady()`; effect bails out over a finalised line. (2) `QuoteDetailsOverlay.tsx`'s `ComposablePlanDetails` — was one undifferentiated list (fix-request #3); now groups inclusions "Included in your plan"/"Your upgrades" and tags streams " · Plan"/" · Upgrade", mirroring `OrderSummary.tsx`/`QuoteSummary.tsx`. (3) matching CSS in `cost-builder.css`.

**Regression (#6):** `upgrade-quote-draft-contract.ts` gained a full KAIROS-shaped scenario (base+add-on+upgrade) asserting one item, add-on gone, both peers, combined projection, exact $166.50/$80 split. `composable-finalise-race-contract.ts` gained direct assertions on `shouldAutoCommitComposableSelection()` — the actual clobber lock, since the race itself is a component-effect timing issue with no DOM/hook harness in this repo (no jsdom/testing-library) to reproduce end-to-end; flagging the gap rather than adding a test framework unasked. Existing guard tests untouched, still pass.

**Verification:** contract:upgrade-quote-draft, contract:composable-finalise-race, `tsc --noEmit`, `npm run build` all pass. Pre-existing unrelated local failures (`quote-view-http-boundary.php`/`quote-view-email-link.php` constructor mismatch, `contract:platform-identity-schema`) reproduce identically on unmodified `main@528f7295` via `git stash` — not touched. No local WP/browser env to reproduce the live journey; this is code/contract-level pending the auditor's own browser re-check.

**Files:** `ComposableOfferBrowser.tsx`, `QuoteDetailsOverlay.tsx`, `resources/css/modules/cost-builder.css` (+ compiled `dist/css`/`dist/js`), `composable-finalise-race-contract.ts`, `upgrade-quote-draft-contract.ts`.
**Review branch:** `review/upgrade-journey-finalisation@eaead453` (base `main@528f7295`). Not merged to `main`.
