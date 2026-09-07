# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — deep-link entry point removed entirely, per Nath's direct instruction**
- Auditor verdict (superseded by this direction change): **Stop — required one-click behavior still not present live**.
- Production `main`: `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31`. Deploy #967 succeeded for that SHA — this is the currently-live, currently-broken state.
- Candidate branch: `hotfix/tier-catalogue-edition-edit-remove-corrupted-deeplink`, two commits, branched fresh from `main`:
  - Phase 1 `380845ca` — removes the drawer-internal auto-open machinery.
  - Phase 2 `db0d26e6` — removes the Customer Selection Rules panel's Edit-button entry point that fed it.
- Not pushed to `main`.

## Direction change (superseding the prior "must preserve one-click" requirement)
After deploy #967, Nath found a SECOND, worse live defect on top of the first: Edition -> Edit opened the inline editor correctly (one click, as required), but closing it (Save or Cancel) left the drawer showing the Edition's read cards with **no header, no footer, no tab strip** — the drawer's own chrome stuck suppressed around otherwise-correct content, not a different/broken component.

Given two consecutive live-validation failures on the same mechanism (first an auto-reopen loop, then this chrome-suppression stick), Nath's explicit instruction was to stop patching this deep-link and remove it entirely — the button, its record-id targeting, and every piece of drawer/controller state that existed only to consume it — rather than attempt a third fix. This **replaces** the "Must preserve: one-click Edition Edit" requirement from the prior round. Confirmed explicitly: the Default | Edition scope-viewing tabs on the Customer Selection Rules panel are NOT part of this removal and must stay exactly as they are (they only ever switched which declaration's data is displayed — never touched Edit/editor state, never implicated in the corruption).

## What's still true (unaffected by either bug or this fix)
- Customer Selection Rules -> **Default** -> Edit: unchanged, still lands directly on the Default Tier Inclusions editor.
- Customer Selection Rules' Default/Edition scope tabs: unchanged, still switch both columns' displayed price/features/FAQ-count/highlights for VIEWING any declaration.
- The Tier drawer's own Options tab, Edition chip strip, each Edition module's own read card + Edit action, Save/Cancel, lifecycle actions, and Publish: unchanged — this was never where either live defect lived.

## What changed (the fix)
**Phase 1** (`useTierDrawerController.ts`, `TierEditionDeclarationSwitcher.tsx`, `TierDrawerContent.tsx`): removed `initialEditionId`, the seeding of `tierTab`/`selectedDeclarationId` from it, `initialEditionEditTab`/`consumeInitialEditionEditTab` state, the `previousEditingTierId` skip-guard that existed only to protect that seed, and the switcher's `initialEditTab`/`onInitialEditTabConsumed` props + auto-open effect. An Edition's inline editor now opens only the way every other module editor in this drawer already does — the admin's own click on a card's Edit action.

**Phase 2** (`TierComposableMiddleShell.tsx`, `PackageTierWorkspace.tsx`, `tierDrawerTypes.ts`, `TierDrawerHost.tsx`): the panel's Edit button now renders ONLY while the Default scope tab is active (hidden for any Edition scope) and dispatches with no declaration-id argument. `dispatchDeclarationEdit` always encodes `'default'`. The now-fully-dead `initialDeclarationId` prop (no reader left anywhere after Phase 1) is removed from the drawer's prop contract and the host's pass-through.

Net result: **Customer Selection Rules has no Edit action for an Edition scope at all.** An Edition is edited the normal way — Build Your Own -> Options -> that Edition's own chip -> its own module's Edit — which neither phase touched.

## Validation (from `wp-content/plugins/compuzign-platform/`)
- `npx tsc --noEmit` — clean, both phases and combined.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS. Items 1-6 (scope tabs/highlights/policy inheritance) and 10-14 (upper-card fields, button copy/style) are proven unchanged; items 7-9 rewritten to prove the entry point and auto-open machinery are both source-scan absent.
- `npx tsx scripts/tier-edition-switch-contract.ts` — PASS.
- `npx tsx scripts/composable-tier-admin-ux-contract.ts` — PASS.
- `npx tsx scripts/tier-customer-policy-draft-contract.ts` — PASS.
- `npx tsx scripts/tier-inclusions-customer-policy-merge-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-admin-contract.ts` — PASS.
- `npx tsx scripts/tier-catalogue-overview-presentation-contract.ts` — PASS.
- `npm run build` — succeeded, `dist/js/admin-station.js` rebuilt (no CSS change).
- Repo-wide grep confirms zero remaining references to every removed symbol (`initialEditionId`, `initialEditionEditTab`, `consumeInitialEditionEditTab`, `initialEditTab`, `onInitialEditTabConsumed`, `initialDeclarationId`, `initialEditApplied`) outside the contract's own negative assertions proving their absence.
- No live/browser validation performed — no WP environment available locally. Given this work item's own history (two separate live-only failures neither round of source-level review or contract-passing caught), live validation here matters more than usual before this goes anywhere near `main`.

## Claude — next action
None pending from this side. Awaiting review of the branch above, then Nath's live validation of the deployed candidate before any push to `main`. If accepted, also decide whether the "Must preserve one-click" language in this file's history should inform a standing rule about not deep-linking into a drawer's own focused-task/chrome-suppression state from outside the drawer — flagging it here rather than deciding unilaterally.
