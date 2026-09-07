# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Edition scope-tab refresh fix ready**
- Production `main`: `77d5ef76e25622ac8c7756f49b4f0073395fdd2d`.
- Deploy: GitHub Actions run #968 — **Success** for exactly that head SHA (currently-live, currently-affected state).
- Candidate branch: `review/tier-catalogue-edition-scope-tab-refresh-fix`, one commit `9d4948a5`, branched from `main`@`77d5ef76`. Not pushed to `main`.
- Accepted architecture from the prior round is untouched by this fix (see below) — keep `review/tier-catalogue-edition-edit-deeplink-removal` closed/no longer needed once this lands; it's already `== main`.

## Accepted architecture remains unchanged
- Customer Selection Rules keeps `Default | Edition ...` scope tabs for viewing declaration-specific data.
- Edit exists only for **Default** and routes to canonical Default Tier Inclusions.
- Edition authoring remains under Build Your Own -> Options -> Edition -> existing module Edit.
- No special Edition deep-link/auto-open path was restored.
- No pricing, resolver, identity, quote/cart/customer behavior changed.

## Root cause found (not a display/filtering bug — a stale-data wiring gap)
Traced the full data path rather than guessing at the component level. `TierComposableMiddleShell.tsx`'s `renderPanel`/`StationTabSet` rendering, and `buildComposableDeclarationScopes()`'s draft-preferred policy resolution, are both structurally correct (verified by direct source reading, not just by the existing tests passing) — every tab's own panel is computed from that tab's own scope object, and `draftPreferredEdition()` genuinely merges a pending draft's `customer_policy` over the settled one.

The actual defect: a Tier drawer opened from the Package Tier Workspace mounts its own **separate** `usePackageStation` instance from the Workspace's own — each screen owns its own read/write state. Every occupant-level mutation in `usePackageStation.ts` already threads its `onRefresh` callback through to `bridge.onMutationComplete`, which is the *only* thing wired to refresh the *originating wall* (`AdminStationDrawerContext`'s `notifySaved()` calling that wall's own `refetch`). But Edition mutations go through a separate hook, `useTierEditions.ts`, whose shared `run()` helper only calls whatever `onMutated` callback it's given — and `TierDrawerContent.tsx` wired that to `c.pkg.refetch` alone: this drawer's own local reload, which never touches the bridge. Edition creation (`useTierDrawerController.ts`'s `handleAddEdition`) had the identical gap.

Net effect: after an admin configures and saves an Edition's own `customer_policy` (or creates a new Edition), the Drawer's own local view updates correctly — so the Drawer itself was never reported broken — but the Workspace's separate `pkg`, and therefore its Customer Selection Rules scope tabs, never got told to refetch, and kept showing stale pre-edit data (which, for an Edition touched only recently or never, looks exactly like "still showing Default's values") until something unrelated forced a Workspace-level refetch.

## Fix
`TierDrawerContent.tsx`: `notifyEditionMutated` (a new `useCallback`) now calls both `c.pkg.refetch()` and `bridge.onMutationComplete?.()` — matching exactly what every occupant-level mutation already does — and is passed to `useTierEditions` in place of `c.pkg.refetch` alone, covering every Edition mutation (create/save/settle/revert/publish/disable/enable/archive/restore/bin travel — all routed through `useTierEditions`' one shared `run()` helper).

`useTierDrawerController.ts`: `handleAddEdition` gets the identical addition (`bridge.onMutationComplete?.()` alongside its existing `pkg.refetch()`) — same root cause, same fix, for Edition creation specifically.

No UI redesign, no routing/edit-behavior change — purely the refresh/state-binding wiring, exactly as scoped.

## Validation (from `wp-content/plugins/compuzign-platform/`)
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS, including two new source-scan assertions (item 15) proving both call sites now notify the bridge.
- `npx tsx scripts/tier-edition-switch-contract.ts`, `composable-tier-admin-ux-contract.ts`, `tier-customer-policy-draft-contract.ts`, `tier-inclusions-customer-policy-merge-contract.ts`, `tier-edition-admin-contract.ts`, `tier-catalogue-overview-presentation-contract.ts` — all PASS.
- `npx tsx scripts/tier-instance-scope-contract.ts`, `tier-instance-tool-contract.ts`, `package-tier-workspace-contract.ts`, `package-tier-workspace-shell-contract.ts`, `tier-edition-move-to-bin-contract.ts`, `tier-system-drawer-contract.ts`, `drawer-module-entry-contract.ts` — all PASS (broader sweep since this touches shared drawer wiring).
- `npm run build` — succeeded, `dist/js/admin-station.js` rebuilt.
- `node scripts/tier-occupant-lifecycle-regression.mjs` / `tier-edition-lifecycle-regression.mjs` — both fail on `d.audienceGroups.length` (TypeError, unrelated to `audienceGroups`/Overview rendering entirely). **Confirmed pre-existing**: reproduced identically on clean `main`@`77d5ef76` with this fix stashed out. Not caused by this change; flagging rather than silently ignoring, since these weren't in this work item's own validation list before.
- No live/browser validation performed — no WP environment available locally. Given this work item's history (three separate live-only defects across this feature, none caught by source review or passing contracts before this round's deeper trace), live validation matters more than usual here.

## Claude — next action
None pending. Awaiting review of `9d4948a5`, then Nath's live validation (select an Edition tab with a genuinely configured `customer_policy`, confirm the right column shows its own values, not Default's) before any push to `main`.
