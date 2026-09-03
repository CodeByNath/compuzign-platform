# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — live policy/browser path now proven; quote/cart connection not built.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on exact SHA.

## Live Admin state
KAIROS Build Your Own is Active, $48.50 monthly, with 3 occupant-owned inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS.

The separate **Customer Options** action is present in the small chevron menu beside View. It opens the standalone Customer Selection Rules drawer, not the shared Tier drawer. Edit correctly shows exactly the 3 occupant-owned rows; the prior full-Rate-Sheet leakage is fixed.

Nath live-authored/published a minimal policy where **Block Storage** is Customer Add/Remove and the other two rows are Not offered. This policy successfully reached the customer `/pricing/` surface.

## Live customer evidence
With a normal KAIROS plan selected, `/pricing/` renders **Upgrade your build** and only the authorized Block Storage card. Add changes to Remove and server preview resolves **$10/mo Ongoing**. No Price Option/Leg/cycle/commitment controls are exposed.

This proves the chain:
`composable occupant -> customer_policy -> public composable_offer -> customer Add/Remove -> server preview`.

## Important remaining boundary
The composable browser is **preview-only**. It currently has no relation/persistence into the quote/cart engine. Selecting Block Storage does not create/update a `FamilyTierQuoteItem`, does not change quote count/TCV, and does not flow to Request/PDF/email. This is expected from Phase 2B1; cart/quote work was deliberately excluded.

Next implementation phase must connect the resolved composable occupant to quote/cart without making each inclusion an independent product. Locked direction:
- one aggregate composable occupant quote snapshot;
- selected-inclusion breakdown + quantities;
- authoritative per-Leg payment summaries;
- explicit composable quote role/key so it coexists with the normal primary occupant and Add-ons;
- never reuse `is_addon` and never create per-inclusion cart identities;
- Request/PDF/email only after quote/cart snapshot is accepted.

## Remaining validation before closing current phase
- Optionally verify direct **Build Your Own** context before any primary Tier selection.
- Stale-policy remove -> settle -> re-add -> settle regression remains untested live and requires explicit mutation authorization.

## Follow-up
Separately scope **Import all current Rate Sheet inclusions** as one-time snapshot/bulk-selection in the normal occupant inclusion editor; no wildcard binding or automatic future Rate Sheet additions.

## Cross-device checkpoint
Safe to continue from another computer by running the Work Cycle and reading this file. Do not start quote/cart source work until the auditor explicitly scopes/approves that next phase.