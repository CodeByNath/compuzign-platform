# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — live customer UI corrections**
- Auditor verdict: **Stop — live gate not complete**
- Validated deployed source: `main@a4a23920c8f84c2bd457790847d2525504270d67`
- Deployment evidence already accepted: Hostinger run `33870415804`, successful for the exact SHA.
- Browser review date: 2026-09-04.

## Architecture and non-change boundaries
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Upgrade must never exist, price, persist, hydrate, resurrect, or act without its exact ready Tier/Edition base.

No `CZTU`/`CZTEU` minting yet; `CZTC`/`CZTEC` remain reserved. Preserve native `tierOccupantId` plus exact Edition identity and the existing occupant pipeline.

The cart’s commercial authority and removal behavior are not under correction. Do not modify cart calculations, cart mutation semantics, source pricing, schema, identity, or unrelated page areas. These requests concern the Upgrade engine’s presentation and read-only quote/build views.

## Browser findings and exact UI corrections

### 1. Upgrade detail uses an incomplete pricing system
The quoted Upgrade detail currently shows only Item Included + Quantity and one Monthly amount. It omits Unit Price and per-row Total, unlike the established Tier detail table.

- Use the same read-only pricing columns and formatting as the established Tier/Edition detail: **Item Included, Quantity, Unit Price, Total**.
- Each row total must be `unit price × current quantity`.
- Billing totals must be derived from those rows and update with quantity.
- Do not create a second pricing source or recompute authoritative rates in presentation code.
- The observed `Build Your Own` label is still prohibited in this Phase 0 Upgrade route; apply the corrected table to the Upgrade representation, not a standalone Build Your Own authority.

### 2. Add compact inclusion quick views to quote items
Each primary, add-on, and Upgrade line in **Your Quote** needs an inclusion quick view without opening the full Details modal.

- Add a small chevron disclosure control to each quote line; inclusions are collapsed by default.
- Clicking the chevron opens a compact dropdown directly beneath/within that quote item.
- While open, that disclosure control changes from chevron to a small × and closes the dropdown.
- Clicking anywhere outside that dropdown wrapper also closes it.
- This is a quick inclusion list only, not the existing full Details popup.
- Keep the existing cart remove control and its behavior unchanged; do not repurpose it as the disclosure ×.
- Show the same quick disclosure for plan, add-on, and Upgrade items.

### 3. Upgrade selections should be a compact list
Replace the oversized selected-inclusion cards under **Upgrade your build** with a compact list.

- Each row uses the established family-header category treatment shown in the browser: small inclusion/category icon in the yellow accent plus matching text size.
- Use a **+** icon for Add and an **×** icon for Remove instead of the words “Add” and “Remove”.
- Preserve accessible names/tooltips and keyboard operation for both icon actions.
- Keep quantity editing inline.
- Put each inclusion’s calculated total inline on its own row as part of that item—not as one detached subtotal below the complete list.
- The inline total is `unit price × quantity` and updates immediately when quantity changes; retain the applicable cadence text such as “/ mo” and “Ongoing”.
- Preserve filtering, sorting, pagination, selection behavior, authoritative rates, and the empty-primary disabled guard.

### 4. Full Details navigation and commitment view
The Details modal’s quoted-plan tabs do not scale and the Total Commitment view hides the composition of each build.

- Restyle quoted-plan tabs as compact chips in one horizontally scrollable carousel; do not wrap them into multiple rows.
- Preserve selected, hover, focus, and keyboard-visible states.
- In **Total Commitment**, add a collapsed chevron inclusion list to each quoted plan/build row, using the same disclosure behavior as the quote quick view.
- Keep totals and commercial summaries unchanged; this only reveals the inclusions belonging to each row.

## Acceptance checks
1. Upgrade detail shows quantity, unit price, row total, and billing total from the same authoritative pricing facts as Tier details.
2. Changing quantity updates that item’s inline total and the existing aggregate once—no duplicate counting.
3. Quote-line chevrons reveal only that line’s inclusions; active chevron becomes ×; outside click closes; existing remove × remains independent.
4. Selected Upgrade inclusions render as the compact yellow-icon list with accessible +/× controls.
5. Details chips remain usable with many quoted items through horizontal scrolling.
6. Total Commitment disclosures reveal the correct inclusions per item without changing totals.
7. No standalone/customer-facing **Build Your Own** authority or label remains in the Phase 0 Upgrade route.
8. Existing cart behavior, primary readiness guard, removal cascades, and hydration protections remain unchanged.

Report affected components, screenshots, accessibility behavior, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
