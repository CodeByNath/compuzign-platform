# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — drawer-header correction pushed to review branch.**
- Auditor verdict on file: **Proceed with safeguards — not CLOSED.**
- Production `main`: `8545eb2ef209ecb44f608e50e73ab9d9e814cbeb` (unchanged — this correction is NOT on `main` yet).
- Deploy to Hostinger run `33589079596` / #930 succeeded on that exact SHA.
- Review branch `fix/composable-tier-workspace-launcher` now `d78629d3` (1 commit ahead of deployed `8545eb2e`).
- **SOURCE PUSH NOT APPROVED for this correction until review.**

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

## Claude correction report — 2026-09-02
Branch `fix/composable-tier-workspace-launcher`, new commit `d78629d3` on top of the deployed `8545eb2e`. Pushed to the same review branch only. **`main` unchanged, not merged, no live mutations.**

**Root cause:** `register.ts` registers one static `title: 'Package Tier'` per drawer template key (`tier` -> `'Package Tier'`); `AdminStationDrawer.tsx` renders `template.title` unconditionally in the drawer's `<h2>`. No seam existed for content to override it per-instance.

**Correction — one additive title-resolution seam, per the safeguards:**
- New optional `setHeaderTitle?: (title: string | null) => void` on `DrawerContentProps` (`station-manager/drawerTypes.ts`) and `EntityDrawerHostBridge` (`drawer-kit/entityDrawerHost.ts`) — mirrors the existing `setHeaderHidden`/`setHeaderAction` pattern exactly: shell-owned state in `AdminStationDrawer.tsx`, guaranteed reset to `null` on template/record change, `null` falls back to `template.title` unchanged. Not fork of the drawer host/chrome — same shell, same template registry.
- `TierDrawerHost.tsx` wires the new prop through to the bridge, same as `setHeaderHidden`.
- `TierDrawerContent.tsx` calls a new exported `vocabulary.ts` function, `resolveTierDrawerHeaderTitle(editingTierId)`, in an effect keyed on `editingTierId`: returns `'Build Your Own'` (the existing `TIER_LABELS[COMPOSABLE_TIER_ID]`) only while the composable occupant is open, `null` otherwise — package overview and every normal Tier/Add-on screen unaffected.
- No routing, persistence, lifecycle, editor module, count, workspace projection, or Add-on-semantics change. Every other registered drawer template (Family, Rate Sheet, Inclusion, …) never calls the new bridge method, so its own title is unaffected.

**Evidence — extended per the safeguard requirement.** `composable-occupant-workspace-contract.ts` section 5 proves: the composable header title is never `'Package Tier'`/`'Package Add-on'`, resolves to `'Build Your Own'`; every normal Tier screen (all five `TIER_KEYS`) and the package-overview screen (`null`) get no override; and `register.ts`'s own base title is still literally `'Package Tier'` in source, unchanged. Sanity-checked: reverted the resolver to always return `null`, contract failed as expected, restored.

**Files changed (10 source + 2 doc-index):** `drawerTypes.ts`, `entityDrawerHost.ts`, `AdminStationDrawer.tsx`, `TierDrawerHost.tsx`, `TierDrawerContent.tsx`, `vocabulary.ts`, `composable-occupant-workspace-contract.ts`, `dist/js/admin-station.js` (rebuilt); `docs/code-map/tier-composable-occupant-admin-ui.md` split into itself (Phase 1B) plus new `tier-composable-occupant-workspace-ui.md` (Phase 1C, now covers this fix) since it had grown past 900 words across three rounds — `000-README.md`/`tier-composable-occupant.md` links updated.

**Verified:** `tsc --noEmit` clean; `npm run build` succeeds. Ran the previously-passing suite plus, as a precaution since this touches the shared drawer shell every entity drawer uses: `composable-occupant-workspace`, `composable-occupant-address`, `package-tier-workspace`, `package-tier-workspace-shell`, `package-family-lifecycle`, `tier-edition-admin`, `tier-edition-switch`, `tier-instance-scope`, `tier-drawer-editor-chrome`, `drawer-module-entry`, `tier-system-drawer`, `tier-occupant-card-drawer-unification` — all pass. No PHP changed. No live browser check performed on this correction yet.