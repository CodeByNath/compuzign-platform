# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Shipped tree: `8b4667555d6d90c405aec5489a4a5f5294d064c9`.
- Deploy run `34666424161`: **success**.
- Review branch removed; repository is back to `main` + `Project-work-instructions`.

## Closure
Nath live-validated the final UI refinement and passed it.

Accepted result:
- lone Tier inside the active customer group keeps the focused shell with no X and customer-group tabs;
- selected Tier card width is owned by the Tier strip grid, with the old 440px cap removed;
- compact Upgrade Recommendations spans the full 9-row range and no longer inflates one TierCard subgrid row;
- compact CTA alignment/spacing, shared secondary `Maybe next time`, overflow-only chevrons, and Upgrade CTA reload parity are accepted;
- pending/browsing Upgrade hides Cart + Add-ons; `Maybe next time` restores ordinary downstream Cart/Add-ons;
- normal Tier/add-on card alignment, quote identity, pricing and Commercial Legs are preserved.

GitHub Actions deployment for the exact production SHA completed successfully, and Nath's live pass closes the browser-validation gate.

This work item is complete. Later defects use a new work file.
