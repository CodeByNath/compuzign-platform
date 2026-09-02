# Composable Tier occupant

## Status
- **CLOSED — Phase 1 accepted.**
- Auditor verdict: **Proceed**.
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Deploy to Hostinger run `33599903039` / #931 succeeded on that exact SHA.

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal CZT/Rate Sheet/Edition/Commercial-Leg/lifecycle/editor machinery but is never a sixth fixed Tier slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Accepted source/deployment
Phase 1 backend, identity, lifecycle, Edition parity, public projection, shared-editor sentinel routing, Family-first workspace launcher, subordinate presentation and drawer-title/accessibility corrections were independently reviewed before production push.

Production boundary is exact: `main` = `1b2efd23064e3d2fac904c21fa4094912b132c41`; Hostinger deployment #931 succeeded on that SHA.

## Final live validation — 2026-09-02
Nath supplied production screenshots covering Focus, Grid, composable drawer, composable Overview Edit and a normal Tier Overview Edit.

Accepted live behavior:
- Family summary remains **Tiers 5**.
- Focus and Grid both retain the same five fixed-slot occupant cards; Build Your Own never joins that collection. (KAIROS currently includes an Add-on occupant in one fixed slot; this does not alter the five-slot cardinality.)
- **Build Your Own** renders once, separately below/outside the five-slot workspace and explicitly as a subordinate composable occupant.
- Empty-state wording does not claim fixed-Tier/Add-on identity.
- Build Your Own opens the existing shared Tier drawer/editor stack; no parallel editor exists.
- Drawer visible header is **Build Your Own**, not Package Tier/Add-on; source contract proves the dialog accessible name uses the same effective title authority.
- Build Your Own → Tier Overview Edit suppresses **Make this Tier an add-on** and **Mark as popular tier**; no Save was performed.
- A normal Tier Overview Edit still exposes those normal controls, proving suppression is composable-context-only.
- No runtime mutation was performed during audit.

Phase 1 is accepted across architecture, reviewed source, `main`, deployment and live Admin behavior.

## Next work
Do not reopen this Phase 1 architecture without hard evidence. Customer composability, quote/cart coexistence, PDF/email and promotions remain separate future phases/work items.