# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Customer Selection Rules UI cleanup ready**
- Production `main`: `9d4948a5db18b9a1c78f21d134ea1432ed3c76e6`.
- Deploy #969 succeeded for exactly that SHA (currently-live state).
- Candidate branch: `review/tier-catalogue-customer-selection-rules-ui-cleanup`, one commit `bd0a48d8`, branched from `main`@`9d4948a5`. Not pushed to `main`.

## Accepted behavior (unaffected by this cleanup)
- `Default | Edition ...` tabs remain and correctly filter the displayed declaration data.
- No special Edition deep-link/auto-open path.
- No pricing, resolver, identity, backend, persistence, quote/cart/customer behavior changes.

## What changed
1. **Edit button removed entirely, including for Default.** `TierComposableMiddleShell.tsx` no longer renders the button or accepts an `onEditDeclaration` prop; `PackageTierWorkspace.tsx` no longer defines `dispatchDeclarationEdit`. The panel is pure view-only now — every declaration (Default included) is edited exclusively through the normal Tier drawer (Build Your Own -> Options for an Edition; the occupant's own Default Tier Inclusions editor for Default). The scope tabs themselves are untouched — still switch both columns' projection for viewing any declaration's own resolved data.
2/3. **Double underline + extra border above first metric row — same root cause, one fix.** `.cz-tier-workspace__composable-metrics`'s own `border-top` sat directly beneath the scope tabs' own bottom border/selected-tab underline (the shared, untouched `StationTabSet` skin — `.cz-station-tabset__list` / `[aria-selected='true']::after`), doubling that line and adding the unwanted separator above the first metric row. Removed the container's own `border-top`; the `> * + *` adjacent-sibling rule still divides each row from the next, so rows after the first keep their own separator.

Also removed the now-orphaned `.cz-tier-workspace__composable-edit` CSS rule. Left `encodeTierDrawerRecordId`/`decodeTierDrawerRecordId`'s 3-arg form and `TierDrawerHost.tsx`'s `declarationId === 'default'` routing check untouched (out of scope per "do not touch routing") — they're now simply unreached by any caller, a fact worth knowing but not acted on here.

## Validation (from `wp-content/plugins/compuzign-platform/`)
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS (items 7/13/14 rewritten, item 16 added for the border fix).
- `npx tsx scripts/tier-edition-switch-contract.ts`, `composable-tier-admin-ux-contract.ts`, `tier-customer-policy-draft-contract.ts`, `tier-inclusions-customer-policy-merge-contract.ts`, `tier-edition-admin-contract.ts`, `tier-catalogue-overview-presentation-contract.ts` — all PASS.
- `npm run docs:check` — PASS (117 Markdown files, 46 Code Maps, 22 numbered history records) — `docs/code-map/tier-composable-occupant-admin-ui.md` synced to describe the panel as pure view-only; tightened elsewhere to stay within its own 600-word cap.
- `npm run build` — succeeded, `dist/js/admin-station.js` and `dist/css/admin-station.css` both rebuilt (CSS bundle shrank slightly, matching the removed rules).
- No live/browser validation performed — no WP environment available locally.

## Claude — next action
None pending. Awaiting review of `bd0a48d8`, then Nath's live check (Edit gone from every scope including Default; single clean underline beneath the tabs; no border above "Always included"; tab filtering/Edition editing otherwise unchanged) before any push to `main`.
