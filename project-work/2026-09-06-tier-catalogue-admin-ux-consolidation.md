# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 3 second-round correction implemented on the reused review branch**
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head is **not approved for main**.

## Claude — second-round correction implementation report

**Branch:** `review/tier-catalogue-declaration-navigation` (reused; still reset
to `main@3cc88e83...`, this round force-pushed on top of the accepted
scope-tab commit).
**Commit:** `0bfc61a7c4feabdc019d0bb04f3aa3d0a9e7e92c` (on top of
`4375642e24e4a4457e33466eecc9f844f082ccfe`, the accepted scope-tab work).
**Built from:** clean production `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.

### What the audit found

The scope-tab projection was accepted, but the panel had no way to actually
EDIT whichever declaration was selected — `TierComposableMiddleShell.tsx`
was presentation-only, and reaching an Edition's own editor still required
leaving the panel and navigating Build Your Own → Options → Edition chip →
Edit manually. This did not satisfy "selecting Edition 2 should display AND
edit Edition 2's inclusion policies."

### What changed

**The panel keeps one Edit action; its target now follows the selected
scope.** Clicking it while `Default` is selected opens straight into the
Default Tier Inclusions editor; while an Edition is selected, it opens
Options with that exact Edition already selected and its own Inclusions
tab already open — no manual re-navigation required (requirement 6).

**Identity plumbing (all additive, no new action/drawer/endpoint):**
- `encodeTierDrawerRecordId`/`decodeTierDrawerRecordId`
  (`tierDrawerTypes.ts`) gain an optional third segment, `declarationId`
  ('default' or a real Edition id). Every existing two-segment caller is
  unaffected (verified: `decodeTierDrawerRecordId(encodeTierDrawerRecordId(a,
  b))` still yields `declarationId: undefined`).
- `TierComposableMiddleShell.tsx`'s Edit button calls
  `onEditDeclaration(active?.id ?? 'default')` — always the CURRENTLY
  SELECTED scope, never hardcoded.
- `PackageTierWorkspace.tsx`'s new `dispatchDeclarationEdit()` encodes the
  record id with that declarationId and dispatches through the SAME
  existing `'edit'` action intent every card's own Edit button already
  uses — no new registration.
- `TierDrawerHost.tsx` decodes it: `declarationId === 'default'` forces
  `initialTierSection: 'tier-inclusions'` (bypassing the generic
  tier-overview landing); any other value is forwarded as
  `initialDeclarationId`.
- `useTierDrawerController.ts` seeds `selectedDeclarationId` and the active
  group (`tierTab: 'options'`) together from a real Edition
  `initialDeclarationId`, in one consistent step. Its own reset effect
  (which normally clears `selectedDeclarationId` whenever `editingTierId`
  changes, so a genuine Tier-to-Tier switch never carries a stale Edition
  selection) is guarded with a previous-value ref so it recognizes and
  skips the composable occupant's own first `null → resolved` load —
  otherwise that same effect would silently wipe the seeded selection
  before the admin ever saw it.
- `TierEditionDeclarationSwitcher.tsx` gains `initialEditTab`: once the
  pre-selected Edition's own draft-preferred data resolves, it calls the
  SAME `openEdit()` a manual Edit click already uses, exactly once.

**No cross-scope overwrite** — structurally guaranteed, not just by
convention: `useTierEditions.saveDraft(editionId, draft)` always routes
through `saveComposableOccupantEditionModule(..., editionId, draft)` keyed
by whichever Edition is currently selected in the controller, so saving
Edition 2 can never reach Edition 1 or Default.

**Fixed a pre-existing contract break** — `tier-system-drawer-contract.ts`
asserted an exact source string
(`initialTierSection={mode === 'edit' && slotTarget === null ? ...}`) that
my new outer condition necessarily changed the shape of. Extracted the
unchanged inner expression into a named `fallbackTierSection` constant and
updated the contract to check for that — same invariant (an empty slot
never auto-opens into edit), same behavior, adapted string.

### Contracts

Extended `scripts/tier-catalogue-declaration-scope-contract.ts` (Section
7-9): real round-trip proof that Default/Edition A/Edition B each produce a
structurally distinct record id and decode back to exactly that
declaration (never bleeding into another); every pre-existing two-segment
caller is unaffected; source-scan proof of the panel's target-follows-
selection button, the `'default'` → `tier-inclusions` resolution, the
Options+selection seeding, the reset-effect guard, and the
auto-open-once effect.

### Validation (all green on the review branch)

`npx tsc --noEmit`, `npm run build` (`dist/js/admin-station.js` rebuilt and
committed), `npm run docs:check` (117 Markdown files, 46 Code Maps — the
admin-ui Code Map's Phase 3 paragraph consolidated to cover both rounds
under the 600-word cap), all 71 `contract:*` scripts other than the 3
already-confirmed pre-existing/unrelated failures
(`contract:admin-station-css`, `contract:package-builder-flow`,
`contract:platform-identity-schema`), and the same 4 pre-existing/unrelated
regression failures re-confirmed via `git stash` against unmodified `main`
(`regression:tier-system-footer-loop`, `regression:tier-occupant-lifecycle`,
`regression:tier-edition-lifecycle`, `regression:tier-publish-timeout`).

### Unresolved / flagged

- Live Admin browser validation of the panel's new Edit-follows-scope
  behavior is required before this can be considered fully closed.
- Do not push `main` before approval.
- The separate Always-included initial-cart hydration defect was not touched.
