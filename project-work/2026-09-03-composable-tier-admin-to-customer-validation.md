# Composable Tier — Admin UX restructuring + customer validation

## Status
- **READY FOR CLAUDE — Admin UI/UX composition only; backend architecture locked.**
- Auditor verdict: **Proceed with safeguards.**
- Production baseline: `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`.

## Proven live state
KAIROS Build Your Own is an Active subordinate composable occupant with 3 occupant-owned inclusions. Customer Options works from the split-button chevron and opens the standalone Customer Selection Rules drawer. A published Block Storage Add/Remove rule reaches `/pricing/`; Add/Remove and server preview `$10/mo Ongoing` work. Quote/cart persistence is still intentionally absent.

## Locked architecture — DO NOT CHANGE
This phase is **Admin UI/UX only**.
- Keep 5 normal Tier occupants exactly as existing backend slots.
- Composable occupant remains the existing subordinate occupant, **not a 6th backend Tier slot** and not `is_addon`.
- Keep existing `customer_policy`, Rate Sheet ownership, inclusions, Legs, Editions, identity, lifecycle, resolver and standalone Customer Options drawer/persistence unchanged.
- No quote/cart/Request/PDF/email work in this phase.

## Nath's Admin UX direction
Reuse the existing Package Tier Engine and Package home patterns rather than creating a new Admin system.

1. In the Tier Engine's existing tab/filter navigation, add **Build Your Own / Composable** as a sixth **workspace destination only**. It may visually sit beside the five Tier destinations, but must never enter `tiers[slot]` or normal Tier selection semantics.
2. When a normal Tier is focused, current UI remains unchanged.
3. When the composable occupant is focused, reuse the normal focused Tier summary/count treatment (inclusions/services/etc.) and normal lower deck.
4. Insert one **composable-only middle shell** between the upper Tier focus area and the existing lower deck. It is hidden for every normal Tier.
5. Middle shell layout:
   - **Left:** up to 6 selected/featured inclusions, using existing occupant/customer-policy data only.
   - **Right:** concise Customer Selection Rules summary: offered mode, Add/Remove state, selected-by-default, quantity-enabled/bounds, Featured as applicable.
   - clear **View/Edit Customer Options** action opens the already-existing standalone customer-policy drawer; do not move policy into the shared Tier drawer.
6. Reuse the normal lower deck unchanged as far as practical:
   - Details → focused inclusion list;
   - Connections → existing connections;
   - Settings → existing Family/Rate Sheet/context information.
7. Prefer composition/reuse of existing Package/Tier components and shell patterns. Do not fork duplicate composable versions unless technically unavoidable.

## Claude implementation boundary
First audit existing Tier Engine tab/filter, focus projection, lower-deck composition, and Package home shell components. Then implement the smallest additive UI composition satisfying the above. No backend/schema/API changes unless you find a hard blocker; if so, stop and report before changing architecture.

Add focused contracts proving:
- 5 normal Tier destinations unchanged;
- composable workspace destination addresses subordinate occupant only;
- composable middle shell visible only when composable focused;
- normal Tier focus has zero composable shell leakage;
- Customer Options action still opens standalone `tier-customer-policy` drawer;
- existing lower-deck tabs/components are reused.

Report exact files, tests, branch/commit and screenshots/static evidence in this same file, set **AWAITING CHATGPT REVIEW**, and do not push to `main` without approval.