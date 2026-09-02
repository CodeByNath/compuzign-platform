# Composable Tier occupant

## Status
- **READY FOR CLAUDE — live validation found one remaining drawer-header presentation leak.**
- Auditor verdict: **Proceed with safeguards — not CLOSED.**
- Production `main`: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb`.
- Deploy to Hostinger run `33589079596` / #930 succeeded on that exact SHA.
- **SOURCE PUSH NOT APPROVED for any new correction until review.**

## Locked architecture
One subordinate `composable_occupant` lives under the existing Tier System, outside the five-slot `tiers` map. It reuses normal occupant/editor/lifecycle machinery but is never a sixth Tier, Add-on, second Tier Instance, or Family assignment.

## Live browser evidence — 2026-09-02
Nath supplied production screenshots from the Family-first KAIROS workspace.

### Passed
- Family summary still reports **Tiers 5**.
- Exactly five normal Package Tier cards remain in the left list.
- Separate subordinate section renders below/outside the five-Tier workspace.
- It is labelled **Build Your Own** / **Subordinate composable occupant** and explicitly says it is not one of the 5 Tiers.
- Empty-state wording is composable-specific: **“This composable occupant is ready to configure.”**
- Opening **Configure Build Your Own** reaches the existing mature Tier drawer with Details / Options / Connections / Support, Tier Overview, Pricing Rules and the normal lifecycle footer. No parallel editor is visible.
- No Save/Publish/Enable/Disable/archive/restore/Edition mutation was performed.

### Blocking live defect
The shared drawer chrome/header still renders **“Package Tier”** at the top when the composable target is open. This contradicts the locked presentation rule even though the internal cards correctly show Build Your Own/composable semantics.

The screenshot also shows the composable Tier Overview itself as Pending with label Build Your Own. Add-on/Popular absence has not yet been interactively verified because the Overview editor was not opened, and Grid mode has not yet been evidenced in this browser pass.

## Claude — exact correction
Find the authority that supplies the Tier drawer's top-level title/chrome label (`Package Tier`) and make it composable-context-aware using the already-existing `COMPOSABLE_TIER_ID` / composable address. The composable drawer header should use **Build Your Own** or **Composable occupant** (pick the smallest wording consistent with the existing admin vocabulary), while every normal Tier/Add-on header remains unchanged.

Safeguards:
- Do not fork the drawer host/chrome.
- Do not change routing, persistence, lifecycle, editor modules, counts, workspace projection, Add-on semantics, or customer/cart/quote/PDF/email/promotion work.
- Prefer one additive title/label resolution seam in the existing shared drawer host/binding.
- Add a focused contract proving normal Tier header stays unchanged and composable header never says Package Tier/Add-on.

Push the correction only to the existing review branch, report exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and do not push to `main`.

## Remaining live checks after correction
- Focus and Grid both retain exactly five normal Tiers plus one separate subordinate launcher.
- composable drawer header is no longer Package Tier/Add-on.
- opening Tier Overview Edit shows Add-on and Popular controls absent only for composable context (do not Save).
- normal Tier drawer still presents normally.