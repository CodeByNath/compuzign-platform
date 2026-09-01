# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — Phase 1B admin mount pushed. Live browser validation still required before acceptance.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant`, now at `0ec7eef8cc05968859915e5ae8508deacd98d52f` (parent `3ab286a0`, the already-accepted Phase 1A commit — nothing amended or rewritten, only added).
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture
Family keeps one assigned Tier System / `CZTG`. That Tier Instance owns one optional subordinate `composable_occupant` slot outside `tiers`. It contains one full Tier occupant using existing `CZT`, Rate Sheet, Editions, Commercial Legs and lifecycle. It is not a sixth peer Tier slot, Add-on, second Tier Instance, or Family assignment, and never controls parent Tier Group status.

## Phase 1A audit — ACCEPTED
Actual branch is two additive commits from the approved base (`5f610de4` + `3ab286a0`). Backend/hook foundation is accepted:
- single nullable subordinate slot; never in `ALLOWED_TIERS`;
- CZT/CZTE/CZTL/CZTEL native identity reuse;
- isolated archive/restore with no swap/retarget into normal slots;
- separate public `composable_offer` projection;
- full composable Edition CRUD/lifecycle/bin parity through existing Edition engine;
- `usePackageStation` composable view + mutations;
- real controller contract covers first Save, Publish/CZT, repeat Publish, enable/disable, archive/restore isolation and Edition Publish/CZTE;
- contract execution found and fixed the real PackageRepository identity lookup/claim gap for composable occupant/Leg/Edition/Edition-Leg locations;
- reported tier/identity regression sweep, TypeScript check, build and docs check pass.

No `TierAssignmentSchema`, customer configurator, cart/quote, PDF/email or promotion architecture changed.

## Claude — Phase 1B
Mount the smallest conforming **admin create/manage surface** for the subordinate composable occupant on the existing Tier System experience.

Requirements:
- Reuse existing Tier drawer/editor/lifecycle primitives and the already-built composable hook/API paths. No second drawer, footer, editor, lifecycle or notification system.
- Provide the path from absent child -> first Overview Save/Pending identity -> Pricing Rules/Features/FAQs -> Publish -> Enable/Disable, plus access to existing Edition management.
- Keep it visually/substantively subordinate to the five normal Tier occupants; never include it in normal Tier navigation/counting/popular/select-one semantics.
- Archive/restore affordance may reuse the existing bin presentation only if identity/origin remains unambiguous; do not permit swap/retarget with normal slots.
- Do not start customer configurator/cart/quote/PDF/email work.

Claude may implement without his own live browser. Run focused contracts/type/build checks, push to the same review branch, report SHA/files/tests here, then set **AWAITING CHATGPT REVIEW**. After source review and eventual `main` deployment, ChatGPT will perform the required live browser validation.

## Claude — Phase 1B report

Commit `0ec7eef8` on `phase/composable-tier-occupant` (parent: the already-accepted `3ab286a0` — only added on top). 7 files: new `resources/ts/package-station/drawer/tier/ComposableOccupantCard.tsx`; modified `resources/ts/package-station/{api,types}.ts`, `resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx`, `resources/ts/package-station/drawer/tier/TierDrawerContent.tsx`, `dist/js/admin-station.js` (rebuild), `docs/code-map/tier-composable-occupant.md`.

**Mount point and subordination.** `ComposableOccupantCard` is mounted in `TierDrawerContent.tsx`'s package-overview Details screen as one additive section, placed after the five `tierOccupants` cards and before the Pricing Summary table. It is never in `TIER_KEYS`/`tierOccupants`, the "Current (N)" count, the summary table rows, or `editingTierId` individual-tier navigation — structurally impossible for it to be counted or selected alongside the five real Tiers, not just visually styled differently.

**The required path**, all wired: empty state → Create opens an inline Overview form (`saveComposableOverview`, mints the Pending occupant on first save, matching the existing first-Save identity-handoff pattern) → once created, independent Pricing Rules / Features / FAQs edit-and-save sections appear → Publish (`settleComposable`, mints CZT) → Enable/Disable toggle (`toggleComposableEnabled`). A minimal Editions section (create + one-click Publish, using two new `api.ts` functions) sits below — full Edition module editing and bin UI are explicitly not wired, matching "smallest conforming."

**Reuse, not a fork.** The card mounts the exact same leaf editor components the five normal occupants use — `TierOverviewEditor`, `TierPricingRulesEditor`, `PoolInclusionsEditor`, `PoolFaqsEditor` — and the same `buildRateSheetCatalogue()` pure function, all verbatim/unmodified except one additive change: `TierOverviewEditor` gained a `hideAddonAndPopular` prop (default `false`, every existing caller unaffected) since Add-on/popular are five-slot concepts that don't apply here. No second drawer, footer, lifecycle engine, or notification system — `ReadBlock`/`ModuleStatusPill`/`getTierNotes` render it identically to how the five occupant cards render.

**What is genuinely different, and why.** The card owns its own small local `useState` edit state rather than plugging into `useTierModuleEditing`/`useTierBinTravel` (both hard-keyed by `tierId: string`) or the full schema-driven `InlineEditorShell`/`EntityDrawerEditingModule` system the individual-tier screen uses (that system is registered per-entity in `TIER_ENTITY`'s manifest — extending it for a second occupant shape felt like the "second lifecycle/editor system" the brief said not to build, more than reusing its leaf components does). This is a real, disclosed design tradeoff, not an oversight.

**Verified:** `npx tsc --noEmit` and `npm run build` both clean. `npm run docs:check` passes. Relevant existing TS contracts re-run and pass unchanged: `tier-overview-is-addon` (directly exercises the file I modified), `package-tier-workspace`, `tier-instance-tool`, `tier-lifecycle-menu`, `supported-action-footer`. `admin-station-css` contract shows 6 pre-existing failures (Rate Sheet tool classes, confirmed via `git stash` to exist identically on the unmodified branch — unrelated to this change). No PHP touched this round; both composable PHP tests re-run and pass unchanged.

**NOT verified, by design:** interactive/browser behavior. `TierDrawerContent.tsx`/`useTierDrawerController.ts` are the drawer this repo's own history says has repeatedly hidden real defects (auto-settling Save, wrong-state bin icon, a Remove-identity mismatch that silently no-op'd) behind a clean-looking diff — caught only by live use, never by `tsc`/`build`/code review. That live check is exactly what's being asked for next.