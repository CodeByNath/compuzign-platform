# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Previously approved candidate `e571b71f657beba4b431fd6ad034d6296ae41202` is rejected before push after Nath's visual review.
- Review branch: `feat/single-visible-tier-focus-polish`.

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
