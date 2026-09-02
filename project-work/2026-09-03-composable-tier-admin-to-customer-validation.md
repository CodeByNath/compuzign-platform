# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — exact reviewed source deployed.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main`: `8ff4eff90129f15f8140858d21cb923dd2f5d549`.
- Review branch `review/composable-tier-admin-customer-policy` is byte-identical to `main`.
- Hostinger deploy #934 / run `33691866996`: completed / success for exact `head_sha=8ff4eff90129f15f8140858d21cb923dd2f5d549`.

## Locked architecture
Build Your Own remains a normal full Tier occupant for product definition and lifecycle. Customer Selection Rules are a separate external controller/drawer launched from the composable occupant shell after the occupant is active/published. The shared normal Tier drawer remains the established four-module product editor.

Customer Options controls only existing occupant inclusion `item_id`s: required/optional/excluded, optional default-selected, fixed vs configurable quantity with default/min/max/step, and Featured. Price Option, Commercial Legs, commitment and Editions stay occupant-authored and outside this drawer.

## Live setup authorization
Nath authorizes the browser-validation chat to make a **small real configuration change** to the existing KAIROS Build Your Own occupant so this path can be exercised. This is not permission for broad catalogue/package changes.

Authorized now:
- open the existing KAIROS Build Your Own occupant in Studio;
- use the normal occupant editor only;
- select a small set of existing real KAIROS Rate Sheet inclusions sufficient to exercise Required/Optional/quantity/filter behavior;
- use existing authored Price Options/Commercial Legs only; do not invent new pricing structures;
- save the normal occupant configuration and make it **publish-ready**;
- record exactly which inclusions and settings were changed.

**Publishing/activating is not authorized by this note alone.** Stop at the publish boundary and ask Nath in the browser chat for explicit approval before activating the real offer. Do not modify any of the five normal Tier occupants, Family assignment, Service/Category records, Rate Sheet rows, Price Options, or unrelated platform data.

## Browser validation sequence
Use `https://compuzign.weerax.com/studio/`.
1. Confirm Customer Options is absent while Build Your Own is not active/published.
2. Configure the small real inclusion set through normal Build Your Own View/Edit and bring it to publish-ready state.
3. Stop and obtain Nath's explicit approval before Publish/Activate.
4. After authorized publication, return to the Build Your Own shell and verify Customer Options appears only there.
5. Verify View/Edit still opens the normal four-module Tier occupant editor.
6. Open Customer Options and verify its separate Customer Selection Rules drawer contains only the occupant's existing inclusions and only the approved policy controls.
7. Save/reopen the customer-policy draft and verify fidelity. Publish/settle that policy only through the normal Build Your Own lifecycle and only with Nath's explicit authorization for that action.
8. Only after a real policy is active, validate `https://compuzign.weerax.com/pricing/` for Build Your Own / Upgrade your build, filters, Add/Remove, quantity and server-resolved pricing.

## Hard boundaries
No fake records, REST/DevTools bypass, new Rate Sheet rows, new Price Options, new Legs solely for testing, changes to normal Tier/Add-on occupants, cart/quote/Request/PDF/email/promotions/TCV work, or broad cleanup.

## Browser-agent report
Update this same file with the exact runtime changes and observed boundary at each stop. Stop immediately on any architecture mismatch or unexpected mutation.