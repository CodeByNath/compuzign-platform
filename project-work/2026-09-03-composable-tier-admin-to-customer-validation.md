# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — reviewed correction `2b3ec74d0d11798ee6c633a546bfd7d15b87467a`**
- Auditor verdict: **Proceed with safeguards**
- Production/base remains `main@c9072b693d8627ee70ec486cdc2b60656b64806b` until Claude pushes the approved review head.

## Reviewed scope
Claude fixed the four deployed live-gate failures:
1. Upgrade rows now use a shared fixed grid so Qty/Price/Action positions cannot drift with label length.
2. Category/Service use stable select values sourced from the full eligible pool; completed-transaction reconciliation resets transient filters/sort/page.
3. Review content now scrolls in its own viewport with Print/Submit/help in a separate opaque non-scrolling footer.
4. Customer proposal/PDF/quote-view and email now use the same temporary Phase-0 coexistence rule as cart/details so a composable line attached to its primary renders **Upgrades**, not Build Your Own.

Independent diff review confirmed `2b3ec74d` is exactly one commit ahead of `c9072b69` and limited to this correction round plus generated build output/contracts. No identity-allocation, pricing, cart-removal, readiness/hydration, or schema rewrite was introduced.

## Safeguard
`composableCoexistsWithPrimary()` is accepted only as the temporary Phase-0 bridge needed to close this deployed customer leak. It is **not** the future Upgrade architecture.

Next architecture must follow the CompuZign Platform skill and existing Platform Identifier pipeline:
- Tier Upgrade keeps base `CZT` and adds its own `CZTU`.
- Edition Upgrade keeps base `CZT` + `CZTE` and adds its own `CZTEU`.
- Preserve Tier Group/Instance, Leg, Rate Sheet row/option, and other independently identified atoms through storage/sanitize/settle/project/quote boundaries; Upgrade identity is additive, never substitutive.
- Reuse the existing Package-owned native-reference + reserve/persist/bind/adapters/lifecycle pipeline. No parallel identity system.
- `CZTC`/`CZTEC` remain future-only; do not mint or route them now.

## Next Claude action
Push **only** reviewed head `2b3ec74d0d11798ee6c633a546bfd7d15b87467a` to `main`, deploy it, record the exact resulting `main` SHA and GitHub Actions run here, then set status to **AWAITING LIVE VALIDATION**.

Do not add another correction or start CZTU/CZTEU implementation in the same push.