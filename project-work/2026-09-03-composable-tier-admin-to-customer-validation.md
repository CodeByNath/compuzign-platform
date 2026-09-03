# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — Customer Options wiring audit accepted; no source change.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on exact SHA.

## Live evidence already established
KAIROS Build Your Own is Active, $48.50 monthly, with 3 selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS. Opening the primary **View** action correctly opens the normal 4-module Tier drawer.

## Customer Options action audit — accepted
Claude changed no source. The production action chain is internally consistent:
- `usePackageTierWorkspace` applies `withComposableCustomerOptionsAction(..., composableView?.detail.enabled === true)` to the composable card.
- The same `enabled` fact drives the displayed Active state, so an Active composable card is eligible.
- `withComposableCustomerOptionsAction()` appends `customer-options` to the card actions.
- Projection and `TierDetailPanel` pass actions through unchanged.
- `StationSplitAction` always uses the first action as the visible primary **View** button and places later actions in the small chevron dropdown.
- `customer-options` remains wired to the standalone `tier-customer-policy` drawer.

Therefore the prior screenshot does not prove the action is missing; it shows the closed split-button and the result of clicking its primary View half. The correct live check is the small **▾ chevron** beside View. Hard-refresh first to exclude an old cached Admin bundle.

## Exact live validation now
1. Hard-refresh Studio.
2. On **Package Build Your Own**, click the small **▾** immediately right of **View**, not View itself.
3. Expected menu includes **Edit** and **Customer Options**. If Customer Options is absent after hard refresh, stop and capture the open menu.
4. Open **Customer Options**. Its standalone Customer Selection Rules drawer must not be the shared Tier drawer.
5. Edit must show exactly these 3 occupant-owned rows and no full Rate Sheet leakage:
   - 2 vCPU
   - Block Storage
   - Backup Storage — BaaS
6. Then, only with Nath's explicit approval for the live mutation, author at least one Required/Optional rule, Save, Publish/settle Build Your Own, reopen and confirm persistence.
7. After a real policy is published, validate `/pricing/` for Build Your Own before primary selection and Upgrade your build afterward.
8. Stale remove/re-add regression remains the final Admin persistence check and must not be run without explicit live-mutation authorization.

Stop on any unexpected mutation to normal Tiers/Add-ons, Family assignment, Rate Sheet data, Legs, Price Options or Editions.

## Follow-up — separate scope
After this live gate closes, separately scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk-selection action in the normal occupant inclusion editor. No wildcard binding or automatic future Rate Sheet additions.

## Next action
Live UI check only. No Claude source work authorized unless the chevron menu is genuinely missing Customer Options after hard refresh.