# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED** still stands — nothing pushed to `main` this round.
- Auditor verdict last round: **Proceed with safeguards**.
- Review branch: `feat/single-visible-tier-focus-polish`, head `8271bb02`.

### Correction to this file's own premise
The round-2 candidate `e571b71f657beba4b431fd6ad034d6296ae41202` was **not**
stopped before push. `git ls-remote origin main` resolves to that exact SHA:
it is current production `main`, with `7ffd3e4b` its parent. Round 3 is
therefore built on it rather than on `7ffd3e4b`, which also satisfies this
file's own instruction literally — "one clean candidate from current `main`
containing the already accepted round-2 behavior plus only these visual/grid
corrections" — since current `main` *is* that behavior. One commit, parented
directly on production `main`, no rejected intermediate commits in its
ancestry. If the intent was instead to un-ship round 2 from live, that is a
separate revert decision this round has not taken.

## Live visual corrections

### 1. Remove Tier card width cap
Base CSS still has `.cz-cost-builder__tier { max-width: 440px; }`. Remove that cap completely so the selected Tier can fill its grid column. Do not replace it with another arbitrary max-width or selected-card-only width rule; the existing Tier strip grid owns column width.

### 2. Compact Recommendations shell must match Nath's proven layout
Use proper CompuZign tokens/shared CSS, but preserve the demonstrated structure:
- flex container;
- `justify-content: center` and `align-items: center`;
- no fixed height; content-sized vertically;
- token padding nearest the demonstrated ~44px;
- compact shell `h4`, `h3`, and `p` occupy the full available row width and center text;
- `Upgrade your build` gets about 12px extra lower spacing via the matching token.

### 3. Do not let the compact CTA distort the Tier card's 9-row subgrid
The screenshot exposes a second layout defect: the CTA shell is a direct child of `.cz-cost-builder__tiers`, whose parent defines `grid-template-rows: repeat(9, auto)`. Because the Tier card subgrids those same 9 rows, the compact CTA is currently participating in the shared row sizing and inflating an upper row, which creates the large blank area at the top of the selected Tier card.

Fix **only the compact CTA placement** so it does not size any one Tier-card section row. Preserve the 9-row/subgrid architecture for real Tier cards and all normal comparison/add-on layouts.

Preferred direction to audit first: make the compact CTA occupy/span the full Tier-card row range (`grid-row: 1 / span 9` or the exact equivalent for this grid) and center itself within that spanning area, so the Tier card continues to determine its own section-row heights. The compact shell itself remains content-height; spanning is placement, not a forced card height.

Do not flatten/remove `grid-template-rows`, remove TierCard subgrid, or weaken comparison-card alignment just to fix this CTA-only case.

## Keep the already-correct parts
- `Maybe next time` uses the shared secondary Tier choose treatment;
- chevrons only render on real overflow;
- CTA-only horizontal gap stays parent/grid-owned;
- restored pending Upgrade CTA survives refresh;
- pending CTA/browsing hide Cart and Add-ons; `Maybe next time` restores normal downstream state;
- lone-group no-X/tabs, quote identity, pricing/Legs and other card grids remain unchanged.

## Claude — correction only
On the same review branch, rebuild one clean candidate from current `main` containing the already accepted round-2 behavior plus only these visual/grid corrections.

Add/adjust the CSS contract so it catches both regressions: no `max-width: 440px` on the base Tier card, and compact CTA placement cannot inflate one shared Tier row. Run the same focused CSS/CTA contract, TypeScript/build/docs and mounted navigation regressions. Record exact SHA/tree/files, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

---

## Round 3 — Claude implementation record

**Candidate:** `feat/single-visible-tier-focus-polish` @ `8271bb02`
(tree `8b4667555d6d90c405aec5489a4a5f5294d064c9`), parent `e571b71f`
(= current production `main`). Pushed to the review branch only.

**Files changed (3):**
- `resources/css/modules/cost-builder.css`
- `scripts/composable-recommendations-cta-contract.ts`
- `dist/css/cost-builder.css` (rebuilt output)

**Item 1 — width cap.** `max-width: 440px` removed from
`.cz-cost-builder__tier`, and the `max-width: none` in the `767px` block that
existed only to cancel it. Not replaced: no new cap, no selected-card-only
width rule. `440px` now appears nowhere in the stylesheet. Nothing asserted
it — it entered in `9dd6f790`.

**Item 3 — compact CTA row participation.** Root cause confirmed as
described: `.cz-cost-builder__recommendations-shell--compact` carried
`grid-row: auto`, so under the strip's `grid-auto-flow: column` /
`repeat(9, auto)` it auto-placed into a **single** shared row track and its
own content height became that track's height — which the subgridding
TierCard then inherited on its Product Badge row. Now `grid-row: 1 / span 9`,
the preferred direction: the height is distributed across the whole card
range instead of one section row. `align-self: center` and `height: auto`
are unchanged, so it is still content-sized and centred — placement only, no
forced card height. `grid-template-rows: repeat(9, auto)`, TierCard's
`subgrid` / `1 / span 9`, the ordinary add-on shell's own `1 / span 8` and
every comparison/add-on layout are untouched.

**Item 2 — compact shell presentation.** Now carries the demonstrated
structure: flex column, `justify-content: center` **and** `align-items:
center`, `text-align: center`, no fixed height, `padding: var(--cz-space-10)`
(40px — the rhythm scale has no 44px step; 40 and 48 are equidistant, so the
lower step is kept rather than inventing a token). Because `align-items:
center` would otherwise shrink the text rows to their own glyphs, the h4 and
the CTA column that carries the h3 and eyebrow p are given `width: 100%`, so
those three rows occupy the full available row width and centre text there.
The Upgrade heading's lower spacing moves `--cz-space-2` → `--cz-space-3`
for the ~12px asked for.

**Contract.** Both regressions are stylesheet facts the mounted regressions
cannot see (happy-dom applies no CSS), so
`composable-recommendations-cta-contract.ts` §8c now locks: the base Tier
card rule carries no `max-width` and `440px` is absent sheet-wide; the
compact CTA is `1 / span 9` and centres rather than stretching; and the
9-row strip plus TierCard subgrid must still exist, so a future CTA fix
cannot flatten the architecture to get out of the way. §8b's centring check
was widened to require `align-items: center` and the full-width opt-back
rather than forbidding `align-items` as the round-2 wording did. **Each new
check was verified to fail with its own defect reintroduced**, then restored.

**Validation (all pass).** `contract:composable-recommendations-cta`,
`contract:cost-builder-isolation`, `contract:upgrade-build-footer`,
`contract:package-builder-addon-focus`,
`contract:package-builder-regression-lock`;
`regression:tier-next-step-navigation` (93),
`regression:single-occupant-quoted-focus` (87),
`regression:cart-bundle-upgrade-refinements` (48); `tsc --noEmit` clean;
`vite build` clean; `docs:check` clean (118 Markdown, 47 Code Maps).
No Code Map documents these CSS facts, so none needed updating.

**Not verified:** live browser rendering. Both items are CSS-only and no
tooling here applies CSS — the grid reasoning above is derived from the
stylesheet, and only live validation can confirm the blank band is gone.

**Observation, not acted on.** `align-self: center` on the compact shell
predates this round (it is on current `main`). Below 767px the strip becomes
`display: flex; flex-direction: column`, where `align-self` governs the
*horizontal* axis — so the compact shell hugs its content width there
instead of filling. Out of scope for the three stated corrections; flagged
rather than changed. Worth a look during live validation at phone width.
