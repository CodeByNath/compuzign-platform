# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Previously approved candidate `e571b71f657beba4b431fd6ad034d6296ae41202` is now **rejected before push** after Nath's visual review.
- Review branch: `feat/single-visible-tier-focus-polish`.

## Live visual correction
Nath's reference/proof CSS was not followed closely enough. The selected Tier card is still visibly constrained because base CSS still contains:

```css
.cz-cost-builder__tier {
  max-width: 440px;
}
```

That max-width must be removed so the Tier card can fill the grid column beside the compact Recommendations shell. Do not replace it with a different arbitrary cap or a special selected-card width override; let the existing grid track own width.

Also align the compact shell to Nath's proven layout intent using proper CompuZign tokens/shared CSS:
- flex container;
- centered on both axes (`justify-content` + `align-items`);
- content-sized height/no fixed height;
- token padding nearest the demonstrated ~44px;
- compact shell `h4`, `h3`, and `p` take the full available row width and center text;
- `Upgrade your build` gets the demonstrated extra lower spacing (about 12px, use the matching spacing token).

The earlier implementation deliberately omitted `align-items:center`; that was an auditor/Claude interpretation and is not the requested design. Nath's full-width heading/copy rule is what prevents centering from shrinking those text rows.

## Keep the already-correct parts
- `Maybe next time` reuses the shared secondary Tier choose treatment;
- chevrons only render on real overflow;
- CTA-only gap remains parent/grid-owned;
- restored pending Upgrade CTA survives refresh;
- pending CTA/browsing still hide Cart and Add-ons; `Maybe next time` restores ordinary downstream state;
- lone-group no-X/tabs and all quote/pricing/Leg behavior remain unchanged.

## Claude — correction only
Do not redesign anything. On the same review branch, rebuild one clean candidate from current `main` with only the visual correction above on top of the already accepted round-2 behavior.

Verify the base Tier card no longer has the 440px max-width constraint and that the compact CTA shell follows Nath's demonstrated alignment/full-width-copy intent. Keep token/shared-style usage; no inline CSS and no hardcoded Family/Tier conditions.

Run the focused CSS/CTA contract, TypeScript/build/docs, and navigation regressions already used in this work. Record exact SHA/tree/files, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
