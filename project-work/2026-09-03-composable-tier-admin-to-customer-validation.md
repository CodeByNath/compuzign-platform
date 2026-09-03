# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — next phase: composable occupant -> quote/cart connection.**
- Auditor verdict: **Proceed with safeguards.**
- Current production: `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`; Deploy #936 succeeded.

## Current accepted chain
Admin architecture/UI path is accepted live:
- five normal Tier backend slots remain five;
- Build Your Own is subordinate workspace only;
- Customer Options standalone drawer works;
- composable middle shell + reused lower deck work live;
- published Block Storage Add/Remove policy reaches `/pricing/`;
- Add/Remove and server preview `$10/mo Ongoing` work.

This work area is **not globally closed**. UI/UX refinements remain for later review; continue in this same work file until the whole composable chain is complete.

## Next phase — quote/cart connection only
Connect the already-resolved composable customer state to the existing quote engine. Preserve all existing backend architecture.

Locked direction:
- composable occupant remains one aggregate commercial authority;
- customer-selected inclusions/quantities are a quote-time composition snapshot, never mutation of the published occupant;
- create/update **one composable quote item/snapshot**, not one cart product per inclusion;
- do not reuse `is_addon`;
- composable must coexist with the normal primary Tier/Edition and existing Add-ons;
- snapshot carries selected inclusion breakdown + quantities and authoritative resolved per-Leg payment summaries;
- cart/TCV must consume that resolved snapshot rather than inventing flat totals;
- no Request/PDF/email work yet; those come only after quote/cart is accepted;
- no new CZTG/entity/Rate Sheet/customer product identity.

## Claude first action — audit before implementation
Audit the current customer preview -> quote/cart boundary and report the smallest safe design **before editing source**. Inspect at minimum:
- `FamilyTierQuoteItem` and quote key/role construction;
- `replaceFamilyNormalQuoteItem()` and Add-on coexistence semantics;
- `legPaymentSummaries` production/consumption;
- cart totals/TCV calculation and rendering;
- `ComposableOfferBrowser` / preview response shape and the exact server-resolved data currently available after Add/qty changes;
- quote persistence/storage compatibility and any downstream assumptions that only primary/add-on roles exist.

Answer in this same file with:
1. exact proposed composable quote role/key;
2. exact snapshot fields to reuse/add;
3. add/update/remove behavior when customer changes composition or removes all optional selections;
4. coexistence proof with primary + Add-ons;
5. TCV/payment-stream handling;
6. migration/backward-compat risks;
7. exact files likely to change and tests required.

Set status **AWAITING CHATGPT REVIEW** after the audit. **Do not implement yet.**

## Deferred within this same work track
After quote/cart acceptance: Request -> PDF -> customer email propagation, then a dedicated UI/UX refinement pass across Admin + customer composable surfaces before final closure.