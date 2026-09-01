# Composable Tier occupant

## Status
- **READY FOR CLAUDE — Phase 1B admin mount only.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant` at `3ab286a0a52e93fcd90b951868f6ac4167bd3338`.
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture
Family keeps one assigned Tier System / `CZTG`. That Tier Instance owns one optional subordinate `composable_occupant` slot outside `tiers`. It contains one full Tier occupant using existing `CZT`, Rate Sheet, Editions, Commercial Legs and lifecycle. It is not a sixth peer Tier slot, Add-on, second Tier Instance, or Family assignment, and never controls parent Tier Group status.

## Phase 1A audit — ACCEPTED
Actual branch is two additive commits from the approved base (`5f610de4` + `3ab286a0`). Backend/hook foundation is accepted:
- single nullable subordinate slot; never in `ALLOWED_TIERS`;
- CZT/CZTE/CZTL/CZTEL native identity reuse;
- isolated archive/restore with no swap/retarget into normal slots;
- separate public `composable_offer` projection;
- full composable Edition CRUD/lifecycle/bin parity through existing Edition engine;
- `usePackageStation` composable view + mutations;
- real controller contract covers first Save, Publish/CZT, repeat Publish, enable/disable, archive/restore isolation and Edition Publish/CZTE;
- contract execution found and fixed the real PackageRepository identity lookup/claim gap for composable occupant/Leg/Edition/Edition-Leg locations;
- reported tier/identity regression sweep, TypeScript check, build and docs check pass.

No `TierAssignmentSchema`, customer configurator, cart/quote, PDF/email or promotion architecture changed.

## Claude — Phase 1B
Mount the smallest conforming **admin create/manage surface** for the subordinate composable occupant on the existing Tier System experience.

Requirements:
- Reuse existing Tier drawer/editor/lifecycle primitives and the already-built composable hook/API paths. No second drawer, footer, editor, lifecycle or notification system.
- Provide the path from absent child -> first Overview Save/Pending identity -> Pricing Rules/Features/FAQs -> Publish -> Enable/Disable, plus access to existing Edition management.
- Keep it visually/substantively subordinate to the five normal Tier occupants; never include it in normal Tier navigation/counting/popular/select-one semantics.
- Archive/restore affordance may reuse the existing bin presentation only if identity/origin remains unambiguous; do not permit swap/retarget with normal slots.
- Do not start customer configurator/cart/quote/PDF/email work.

Claude may implement without his own live browser. Run focused contracts/type/build checks, push to the same review branch, report SHA/files/tests here, then set **AWAITING CHATGPT REVIEW**. After source review and eventual `main` deployment, ChatGPT will perform the required live browser validation.