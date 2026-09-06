# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — live validation found the real missing piece: no Admin declaration path for `is_upgrade_offer`**
- Auditor verdict: **Proceed with safeguards; Phase 1 remains open**.
- Production: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`; deploy #957 succeeded.
- Nath supplied live screenshot of **Build Your Own → Tier Overview**: existing `CZT...` renders, but there is no Upgrade Platform ID row because no CZTU exists on that record.

## Root cause confirmed from source
The display correction is functioning as designed: it hides Upgrade Platform ID when the value is absent.

The real failure is earlier in the lifecycle:
- backend `settleComposableOccupant()` only reserves CZTU when settled occupant `is_upgrade_offer === true`;
- composable Overview save endpoint accepts `is_upgrade_offer` and stores it in the Overview draft;
- however `TierOverviewEditor.tsx`, including its composable reuse path (`hideAddonAndPopular`), exposes **no control for `is_upgrade_offer`**.

Therefore the live Build Your Own record has no supported Admin UI action to declare itself an Upgrade offer. Running the one-time Platform ID assignment button cannot assign CZTU to an undeclared record. The screenshot is consistent with that exact state.

This also explains the earlier migration expectation of processed 0: the new Upgrade scopes are eligibility-gated by `is_upgrade_offer`; none of the existing records had a UI path to set it.

## Required correction — smallest lifecycle/UI slice
1. Do not alter Platform Identifier minting, native references, migration engine, or the dual-ID Overview rows.
2. Add an explicit Admin authoring control for the composable occupant's Upgrade declaration using the **existing Overview module save path** and existing `is_upgrade_offer` field. Do not add a new endpoint or second settings store.
3. The control must only exist for the composable/Build Your Own occupant; ordinary Tier/Add-on Overview must remain unable to author `is_upgrade_offer`.
4. Label/copy must make the domain meaning clear (e.g. **Declare as Upgrade offer**), not imply that it changes the Tier's underlying CZT identity.
5. Existing value must round-trip draft-preferred through Overview edit/save/revert/settle. Publish/settle with declaration true mints/binds CZTU through the already-shipped backend path; false does not.
6. Audit mutation semantics before implementation: once CZTU exists, clearing `is_upgrade_offer` must **not orphan, reassign, or erase** the existing permanent CZTU. Determine current backend behavior and preserve additive permanent identity. If current save/settle would make the already-minted ID semantically dormant, document that explicitly; do not delete/recycle it.
7. For composable Editions, verify whether an equivalent Admin control already exists for Edition `is_upgrade_offer`. If absent, include the same bounded control in the Edition Overview editor using its existing draft/status path; ordinary Editions outside the composable occupant must remain ineligible.
8. Add focused contracts for authoring visibility, draft persistence, settle eligibility, and permanent-ID preservation. No quote/Request/cart/PDF/email/order/pricing/resolver work.

After audit/implementation, return one clean review commit on current production and set **AWAITING CHATGPT REVIEW**. Do not push main before review.