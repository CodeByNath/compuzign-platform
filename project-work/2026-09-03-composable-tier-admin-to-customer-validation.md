# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — no customer frontend regression found.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on exact SHA.

## Current live state
KAIROS Build Your Own is an active subordinate occupant with three selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS. Customer Options is the separate external policy controller.

## Customer visibility audit — accepted
Claude made no source changes. Independent source review agrees with his finding:
- `FamilyTierAdapter` still mounts `ComposableOfferBrowser` unconditionally as the customer pricing sibling.
- Context remains **Build Your Own** before a normal Tier is selected and **Upgrade your build** afterward.
- `ComposableOfferBrowser` deliberately returns `null` when there is no public policy or no policy-backed offered row.
- Public projection filters null/excluded policy state, so an active composable occupant with no settled authorized policy correctly produces no customer browser.

Important correction to earlier assumptions: before `41884a41`, `upsertOccupant()` dropped `customer_policy` on settle. Therefore a real KAIROS Customer Options policy could not previously survive Publish. The earlier documented customer UX validation was synthetic/mock-data validation; the Admin Build Your Own launcher is a separate Admin surface. No accepted evidence shows a real published KAIROS policy-backed `/pricing/` browser existed and was later removed.

## Exact live gate now
No source change is needed before validation.

Using the existing KAIROS Build Your Own occupant:
1. Open **Customer Options → Edit** and first confirm exactly the 3 occupant-owned rows appear, not the full Rate Sheet catalogue.
2. Author at least one of those rows as **Required** or **Optional**; leave Price Option/Leg/cycle/commitment untouched.
3. Save Customer Options, then **Publish/settle Build Your Own** through its normal occupant lifecycle. Customer Options Save alone is only a draft.
4. Reopen Customer Options and confirm the authored rule survived Publish.
5. Open `/pricing/`: before primary selection, the existing shipped browser should render **Build Your Own**; after a normal Tier/Edition selection, the same browser should present **Upgrade your build**.
6. Validate Add/Remove and quantity only where the authored policy permits it; pricing must come from server preview.

Then perform the stale-rule regression on one authorized test inclusion: remove it from occupant Features → settle → re-add same item → settle → Customer Options must show it as **Not offered**, not restore its old rule.

Stop on any unexpected mutation to normal Tiers/Add-ons, Family assignment, Rate Sheet data, Legs, Price Options or Editions.

## Follow-up — separate scope
After this live gate closes, separately scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk-selection action in the normal occupant inclusion editor. No wildcard binding or automatic future Rate Sheet additions.

## Next action
Live validation only. No Claude source work authorized unless the live exercise exposes a genuine source defect. Record exact observations and stop before declaring CLOSED.