# Composable Tier occupant

## Status
- **READY FOR CLAUDE — Phase 1A completion on existing review branch.**
- Auditor verdict: **Proceed with safeguards — not yet accepted.**
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant`, audited commit `5f610de4e7802e8ed022cb6381f1273b292618dc`.
- **SOURCE PUSH NOT APPROVED.**

## Accepted architecture
Family keeps one assigned Tier System / `CZTG`. The Tier Instance owns one optional subordinate `composable_occupant` slot outside `tiers`; it contains one full Tier occupant using existing `CZT`, Rate Sheet, lifecycle, Editions and Commercial Legs. It is not a sixth peer slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Audit of `5f610de4`
Actual diff is one commit from approved base, 10 files. Core foundation is directionally accepted:
- `TierInstanceSchema` stores one nullable slot outside `ALLOWED_TIERS`.
- CZT native identity remains `(tier_instance_id, occupant_id)`, so no new identity family is needed.
- dedicated archive/restore prevents swap/retarget into normal slots; composable bin origin is a sentinel, not an allowed Tier id.
- public projection is a sibling `composable_offer`, not merged into normal `tiers`.
- no `TierAssignmentSchema`, cart, quote, PDF/email or customer configurator changes.

### Blocking incompleteness
1. Phase 1A explicitly required an **admin launcher/manage surface**. None is wired. Typed APIs alone do not make the occupant administratively creatable/manageable.
2. The accepted foundation required reuse of the full occupant feature set including **Tier Editions**. The branch carries stored `tier_editions[]` but has no composable Edition CRUD/lifecycle routes, so the occupant is not feature-parity yet.
3. New controller routes have no direct request/controller contract execution; structural mirroring + `php -l` is insufficient evidence for mutation routing/response correctness before source approval.

## Claude — completion round
Continue on `phase/composable-tier-occupant`; do not broaden scope.

- Wire the smallest conforming Package Station admin entry/surface that creates and manages this one subordinate occupant using the existing Tier drawer/editor systems. Do not invent a second drawer/editor/footer/lifecycle system.
- Add composable-owned Tier Edition CRUD/lifecycle/bin addressing by reusing existing Edition engine behavior and identities; do not fork Edition semantics.
- Add focused controller/route contracts that actually invoke the new composable mutation paths under the existing test harness, covering at minimum first Save identity handoff, Publish/CZT, enable-disable, archive-restore, and one Edition lifecycle path.
- Preserve parent Tier Group status independence and all current non-scope boundaries.
- Run focused regression/type/build/docs validation. Do not push to `main`.

Push the completion commit(s) to the same review branch, report exact SHA/files/tests here, and set **AWAITING CHATGPT REVIEW**.