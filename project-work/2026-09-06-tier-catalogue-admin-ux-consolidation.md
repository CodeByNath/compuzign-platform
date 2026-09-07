# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — live gate failed on deployed v2**
- Auditor verdict: **Stop — required one-click behavior still not present live**.
- Production `main`: `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31`.
- Deploy #967 succeeded for exactly that SHA.
- Accepted v2 branch remains pending; do not clean/close this work yet.

## Live failure evidence
Nath tested the deployed Admin UI after #967. Customer Selection Rules -> Edition 2 -> Edit lands on the normal **Edition 2 read cards** under Options (Edition Overview / Edition Pricing Rules / Edition Inclusions). It does **not** open the existing inline Edition editor immediately.

Therefore the v2 source-level contract claimed one-click behavior that the deployed runtime does not deliver.

## Must preserve
- Customer Selection Rules -> Edition X -> Edit is **one click** into the existing `TierEditionEditor` for that exact Edition.
- Save/Cancel returns to the normal full Tier drawer with Options + Edition X selected and normal lifecycle/footer available.
- Post-Save refetch must not reopen the editor.
- Default Edit remains unchanged.

## Must remove/fix
Find the actual runtime break in the complete dispatch chain, not just the child auto-open effect:
`PackageTierWorkspace dispatchDeclarationEdit` -> encoded declaration id -> Admin/Tier drawer host routing/record identity -> `initialDeclarationId` / `initialEditionId` -> controller one-shot intent -> `TierEditionDeclarationSwitcher` -> existing inline editor.

Audit whether the drawer/host is reused instead of remounted, whether a `useState(initialEditionId...)` initializer is stale when routing props change, whether the declaration segment is lost/normalized before reaching the drawer, or another runtime identity/lifecycle seam prevents the one-shot intent from being armed. Do not assume which one; prove the actual cause from source.

## Must not substitute
- no second Edit click;
- no new Edition editor/drawer;
- no extra header/footer/lifecycle/publish controls;
- no reduced read-card landing presented as success;
- no persistence, identity, pricing, resolver, backend, quote/cart/customer changes;
- do not touch Always-included initial-cart hydration.

## Claude — next action
Start from current production `main` and audit the full routing chain above before editing. Prepare a clean replacement review branch only after the root cause is proven. Update/add a focused contract that tests the actual host/routing seam responsible for the live failure, not merely string-presence assertions inside the switcher/controller.

Implement the smallest correction that preserves the one-click invariant and survives both drawer reuse and Edition save/refetch behavior. Run focused `tsc`, relevant contracts, and build. Update this same file with exact root cause, branch/SHA, changed files, evidence, and set **AWAITING CHATGPT REVIEW**. Do not push to `main` until reviewed.