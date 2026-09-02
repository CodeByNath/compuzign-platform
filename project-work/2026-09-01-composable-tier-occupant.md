# Composable Tier occupant

## Status
- **AWAITING FINAL GRID SCREENSHOT — all other read-only live checks passed.**
- Auditor verdict: **Proceed with safeguards; not CLOSED yet.**
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Deploy to Hostinger run `33599903039` / #931 succeeded on that exact SHA.

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Live validation — 2026-09-02
Nath supplied production screenshots after the drawer-title correction.

### Passed
- Focus workspace shows exactly five normal Package Tier occupants and Family summary **Tiers 5**.
- Separate subordinate **Build Your Own** section remains outside the five-Tier list.
- Empty-state copy is composable-specific and does not claim fixed-Tier membership.
- Build Your Own drawer now has visible top-level header **Build Your Own**, not Package Tier/Add-on.
- Drawer reaches the same mature shared Tier editor: Details / Options / Connections / Support, Tier Overview, Pricing Rules and normal lifecycle footer.
- Build Your Own → Tier Overview **Edit** shows only the allowed common controls; **Make this Tier an add-on** and **Mark as popular tier** are absent. No Save was performed.
- A normal Tier Overview editor still shows **Make this Tier an add-on** and **Mark as popular tier**, proving the suppression is composable-context-only rather than a global regression.
- Source contract already proves the drawer `aria-label` and visible `<h2>` share `headerTitle ?? template.title`; no contradictory live visible evidence remains.

### Still needed before CLOSED
One screenshot of the same KAIROS workspace with **Grid** selected, showing:
- only the five normal Tier cards in the Grid collection/count semantics;
- the Build Your Own/composable section still rendered separately outside that collection.

No further drawer/edit interaction is needed. Do not Save/Publish/Enable/Disable/archive/restore anything.

Once that Grid evidence is supplied and clean, close this Phase 1 work item. No Phase 2/customer/cart/quote/PDF/email/promotion work before closure.