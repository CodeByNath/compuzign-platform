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

## Source/deployment acceptance
Independent audit confirms:
- `main` resolves exactly to the approved `8ff4eff9` commit;
- review branch vs `main`: 0 commits / 0 files different;
- deploy #934 succeeded on that exact SHA;
- no cart/quote/Request/PDF/email/promotions/TCV scope entered this phase.

No further Claude source action is authorized unless live validation exposes a genuine defect.

## Live Admin validation — browser chat
Use `https://compuzign.weerax.com/studio/`.

Do not create fake records. Use the existing real Build Your Own occupant state. If it is still Empty/unpublished, verify only the gate: **Customer Options must not be available yet**, while normal Configure/View/Edit remains unchanged.

If Nath separately authorizes configuring/publishing a genuine Build Your Own offer, follow the normal occupant workflow first. After it becomes active/published, return to the Build Your Own shell and verify:
1. **Customer Options** appears only on that composable card, not the five normal Tier/Add-on cards.
2. Normal **View/Edit** still opens the unchanged normal Tier occupant editor.
3. Customer Options opens a separate Customer Selection Rules drawer, not Details/Pricing Rules/Features/FAQs.
4. Drawer rows are only existing inclusions from that Build Your Own occupant.
5. Controls shown: Not offered / Always included / Customer Add-Remove; Selected by default for optional; customer-configurable quantity with default/min/max/step; Featured.
6. No customer Price Option, Commercial Leg, commitment or Edition authoring appears in this drawer.
7. Save/reopen faithfully returns the authored draft. Do not claim customer-facing behavior until the policy is actually settled/published through the occupant lifecycle.

Then, only after a real policy is published, validate `https://compuzign.weerax.com/pricing/` for Build Your Own / Upgrade your build behavior already covered by Phase 2B1.

## Browser-agent report
Update this same file with the exact observed state, any separately-authorized runtime changes, and screenshots/notes. If the occupant remains unconfigured, record the gate result and stop. If a real configuration is authorized, validate one boundary at a time and stop immediately on any architecture mismatch.