# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — clean single-commit candidate ready**
- Auditor verdict (prior round): **Proceed with safeguards** — both blockers below now addressed.
- Production `main`: `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31` (deploy #967 success; currently-live broken deep-link state).
- **Candidate**: `review/tier-catalogue-edition-edit-deeplink-removal` @ `77d5ef76`, exactly **1 commit** ahead of `main`, merge-base = current `main`@`56a15ad9` (no rejected-candidate ancestry). Not pushed to `main`.
- Superseded working branches (kept for reference only, not for review): `hotfix/tier-catalogue-edition-edit-remove-corrupted-deeplink` (the 2-commit working version this was squashed from) and the earlier rejected `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction*` line.

## Both remaining blockers addressed
1. **Code Map synced.** `docs/code-map/tier-composable-occupant-admin-ui.md`'s Phase 3 section rewritten: no longer claims Edit follows the selected scope or carries an Edition id through `encodeTierDrawerRecordId`. New `2026-09-07 reversion` paragraph states the current truth (Edit is Default-only; scope tabs are view-only; Edition editing is reached only through the drawer's normal Options/Edition module Edit) and why (two live-validation failures on the deep-link, not source-review-detectable). The file was already at this doc's own 600-prose-word cap before this edit, so several adjacent paragraphs (Phase 1B intro, "Reused unchanged", "Live-UI correction") were also tightened to make room — no content removed, only reworded more tersely. `docs:check` passes at exactly 600 words.
2. **Branch hygiene.** The reviewed 2-commit working candidate was squashed onto ONE clean commit (`77d5ef76`) on a fresh branch from current production `main`. Verified: `git merge-base main review/tier-catalogue-edition-edit-deeplink-removal` = `56a15ad9...` exactly, and `git log main..HEAD` shows exactly one commit.

## What the single commit contains
Identical source behavior to the already-audited 2-commit candidate, unchanged:
- `useTierDrawerController.ts` / `TierEditionDeclarationSwitcher.tsx` / `TierDrawerContent.tsx`: no seeded-Edition state, one-shot auto-open intent, or the skip-guard that existed only to protect that seed.
- `TierComposableMiddleShell.tsx` / `PackageTierWorkspace.tsx`: the panel's Edit button renders only for the Default scope tab, dispatching no declaration-id argument.
- `tierDrawerTypes.ts` / `TierDrawerHost.tsx`: the now-fully-dead `initialDeclarationId` prop removed entirely.
- `tier-catalogue-declaration-scope-contract.ts`: items 7-9 rewritten to prove the entry point and auto-open machinery are source-scan absent; items 1-6/10-14 unchanged.
- `docs/code-map/tier-composable-occupant-admin-ui.md`: synced (new in this commit vs. the prior 2-commit version).
- `dist/js/admin-station.js`: rebuilt fresh from this exact combined source state.

Net result, unchanged from the prior round: Customer Selection Rules -> Default -> Edit is unaffected. Customer Selection Rules has no Edit action for an Edition scope at all — an Edition is edited the normal way (Build Your Own -> Options -> that Edition's own chip -> its own module's Edit), untouched by either phase.

## Validation (from `wp-content/plugins/compuzign-platform/`, run against the final squashed commit)
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-switch-contract.ts` — PASS.
- `npx tsx scripts/composable-tier-admin-ux-contract.ts` — PASS.
- `npx tsx scripts/tier-customer-policy-draft-contract.ts` — PASS.
- `npx tsx scripts/tier-inclusions-customer-policy-merge-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-admin-contract.ts` — PASS.
- `npx tsx scripts/tier-catalogue-overview-presentation-contract.ts` — PASS.
- `npm run docs:check` — PASS (117 Markdown files, 46 Code Maps, 22 numbered history records).
- `npm run build` — succeeded, `dist/js/admin-station.js` rebuilt.
- No live/browser validation performed — no WP environment available locally. Given this work item's history (two separate live-only failures, neither caught by source review or passing contracts), live validation matters more than usual here before any push to `main`.

## Claude — next action
None pending. Awaiting review of `77d5ef76`, then Nath's live validation of the deployed candidate before any push to `main`.
