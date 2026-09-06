# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 3 correction implemented on the reused review branch**
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head is **not approved for main**.

## Claude — Phase 3 correction implementation report

**Branch:** `review/tier-catalogue-declaration-navigation` (reused per two-branch
policy — reset to `main@3cc88e83...` and force-pushed; the prior rejected
`4ae6505c...` head no longer exists on it).
**Commit:** `4375642e24e4a4457e33466eecc9f844f082ccfe`
**Built from:** clean production `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.

### What changed

**1. Standalone Customer Selection Rules drawer retired outright** (not
merely unregistered) — deleted `TierCustomerPolicyDrawerContent.tsx`,
`useTierCustomerPolicyDrawerController.ts`, `tierCustomerPolicyDrawerTypes.ts`,
`TierCustomerPolicyDrawerHost.tsx`, `drawer/schema/entities/tierCustomerPolicy.ts`,
`drawer/schema/bindings/tierCustomerPolicy.tsx`, `CustomerPolicyEditor.tsx`,
`scripts/tier-customer-policy-drawer-contract.ts`, and the doc
`tier-composable-occupant-admin-customer-policy.md`. Removed the
`tier-customer-policy` drawer registration (`package-station/register.ts`),
the `customer-options` action intent (`admin-station/register.ts`), the
`tierCustomerPolicyModule` notification definition, and
`withComposableCustomerOptionsAction` (the card action it used) entirely.
**No replacement card action was added** — the composable card's own
actions remain exactly `View`/`Edit`, same as every other Tier/Add-on card.

**2. Declaration scope tabs replace the panel's former button** — the auditor's
final approved UX. `TierComposableMiddleShell.tsx` (the workspace's
Customer Selection Rules panel, NOT a drawer) now renders a `Default |
Edition 1 | ...` scope strip via the existing shared `StationTabSet`
primitive, in the panel-head where the retired button used to sit.
Selecting a scope is local `useState`, defaulting to the first (Default)
scope — presentation/navigation only, it never saves/publishes/mutates.
Switching scope re-renders both the Featured-inclusions column and every
policy-summary stat from that declaration's own resolved deck/policy — a
new pure function, `buildComposableDeclarationScopes()`
(`composableMiddleShell.ts`), builds one `{id, label, deck, policy}` entry
for Default plus one per real `tier_editions[]` entry (draft-preferred
title/identity, no synthetic catch-all tab). An Edition's own inclusions
are resolved for display by composing two already-existing pure functions
— `buildRateSheetCatalogue()` (resolves its raw `rate_sheet_items` against
its own bound sheet) then `projectTierInclusions()` (the same dedup/Bundle
expansion every occupant deck already uses) — never a third resolution
algorithm. `usePackageTierWorkspace.ts` wires this into a new
`WorkspaceTierSlot.declarationScopes` field (empty for every fixed slot).

**3. Edition inherit/replace semantics** — an Edition's own `customer_policy`
(added to `TierEdition`/`TierEditionOverviewDraft` in `types.ts`, riding the
SAME `overview` draft/save the backend already accepted since Phase 2A —
verified against `PackageStationController::saveComposableOccupantEditionModule()`
and `PackageSchema::sanitizeTierEdition()`, no backend change needed): null
inherits the occupant's Default policy wholesale (`scopes[n].policy ===
defaultPolicy` by reference in the fixture proof); non-null is a complete
replacement. `draftFromTierEdition()` seeds it; `draftPreferredEdition()`'s
existing generic `{...edition, ...draft}` spread already merges it with no
further change.

**4. Edition-scope authoring** — a Tier Edition's own Inclusions tab
(`TierEditionOverviewFields.tsx`'s `TierEditionInclusionsSection`) now
optionally passes `customerPolicy`/`onCustomerPolicyChange` into the SAME
merged `PoolInclusionsEditor` controls the occupant's own Default Tier
Inclusions module already uses (`customerPolicyFields.tsx` — one shared
mutation/lookup authority, no duplicate). Gated by a new
`customerPolicyEligible` boolean, threaded `TierDrawerContent.tsx` →
`TierEditionDeclarationSwitcher.tsx` → `TierEditionEditor.tsx`, computed as
`isComposableOccupant(editingTierId) && detail.enabled` — the byte-identical
formula the occupant's own gate already uses. `undefined` (the prop, not
passed) for every non-composable Tier's own Edition and for a not-yet-
published composable occupant, so ordinary Tier/Add-on UI and their
Editions are unaffected.

**5. Editor identity / no cross-scope overwrite** — the scope tabs are
read-only presentation; there is no click-through "launch editor from this
scope" control (the retired button's location is now the tabs themselves,
per requirement 1's literal wording). Editing still happens through the
pre-existing entry points: the occupant's own Edit action → Default Tier
Inclusions (unchanged), or Options → select that Edition in the drawer's
own `TierEditionDeclarationSwitcher` chip strip → Edit → Inclusions tab.
Because `TierEditionDeclarationSwitcher.saveEdit()` always calls
`ctl.saveDraft(selected.id, toSave)` against whichever Edition is currently
selected in the drawer (`selected = ctl.editionView(selectedId)`), and
`useTierEditions.saveDraft()` routes every composable-occupant save through
`saveComposableOccupantEditionModule(serviceId, tierInstanceId, editionId,
draft)` keyed by that Edition's own id, saving Edition 2 can structurally
never reach Edition 1 or Default. **Flagging for explicit confirmation:**
if the auditor intended a literal one-click "edit this scope" action inside
the workspace panel itself (rather than routing through the existing
Options chip strip), that is a different, larger change — not implemented,
since requirement 1 reads as retiring the button's location to the tabs.

### Contracts

- **New:** `scripts/tier-catalogue-declaration-scope-contract.ts` — real
  behavior against `buildComposableDeclarationScopes`/
  `projectComposableHighlightInclusions`/`summarizeComposableCustomerPolicy`
  with two fixture Editions (one inheriting, one replacing + its own bound
  Rate Sheet) proving: Default first and initially selected; Editions
  enumerated by real draft-preferred identity; inherit-null/replace-non-null;
  no cross-scope inclusion bleed; Featured + Featured-count genuinely swap
  between scopes; source-scan proof of no standalone destination and no
  third card action.
- **Updated:** `scripts/tier-inclusions-customer-policy-merge-contract.ts`
  (Section 2 drops the deleted `CustomerPolicyEditor.tsx` checks; Section 4
  now proves the Edition eligibility gate rather than asserting Editions
  never receive the prop, since they now conditionally do).
- **Updated:** `scripts/composable-tier-admin-ux-contract.ts` (Section 5
  rewritten: proves the dispatcher/token/action-id/prop are all gone, both
  onAction call sites resolve identically, the middle shell receives
  `scopes`, and the retired files/registrations are genuinely absent).

### Docs

Updated Code Maps: `tier-composable-occupant-admin-ui.md` (Phase 2
paragraph tightened; new Phase 3 correction paragraph),
`tier-composable-occupant-workspace-ui.md` (scope-tab correction to the
Admin UX restructuring section), `tier-composable-occupant-customer-policy.md`
and `tier-edition.md` (note admin authoring of Edition `customer_policy`
now exists). Removed every inbound link to the deleted doc
(`tier-composable-occupant-workspace-ui.md`, `-customer-policy.md`,
`-customer-ux.md`, `000-README.md`). All four trimmed to satisfy the
600-word Code Map cap.

### Validation (all green on the review branch)

`npx tsc --noEmit`, `npm run build` (`dist/js/admin-station.js` rebuilt and
committed), `npm run docs:check` (117 Markdown files, 46 Code Maps), all 71
other `contract:*` scripts (3 pre-existing failures confirmed unrelated and
present on unmodified `main` too, via `git stash`: `contract:admin-station-css`
— stale `.cz-rate-sheet-tool__*` rules; `contract:package-builder-flow` —
missing `FullBuildDetail.tsx`; `contract:platform-identity-schema` — fixture
Platform ID literals in unrelated scripts), and the three focused contracts
above run directly. `regression:tier-occupant-lifecycle`,
`regression:tier-edition-lifecycle`, `regression:tier-publish-timeout`,
`regression:tier-system-footer-loop` also fail identically on unmodified
`main` (an unrelated `d.audienceGroups` crash / a pre-existing Rate Sheet
Access editor issue) — confirmed via the same stash comparison, not caused
by this change.

### Unresolved / flagged

- The Section 5 "editor identity" interpretation above (no click-through
  editor launch from the panel itself) needs explicit confirmation or
  correction.
- Live Admin browser validation of the new scope-tab UI is required before
  this can be considered fully closed, same as every prior phase.
- Do not push `main` before approval.
- The separate Always-included initial-cart hydration defect was not touched.
