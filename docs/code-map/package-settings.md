# Package Home Settings

## Purpose and ownership

Settings is the third lane of the Package Home Tier workspace lower deck. It does two things: it configures the ONE Tier system the workspace has focused, and it launches the drawers that own Package Manager pool creation. Package Station owns every read and write; Admin Station supplies the shell, tokens, icons, and the drawer Settings hands slots to.

Package Manager is a launcher, not an editor. It holds no form, draft, validation, endpoint or save: a subject offers one button, the drawer that owns the record does the rest, and that drawer refreshes this surface through the `refetch` the host handed it at dispatch. Each button opens that drawer **readable**, where the empty module's Pending pill and Edit are the only way in — the Module entry contract in [Drawer System](drawer-system.md).

Settings makes no relationship — it never assigns a Tier system to a Family, offers a Family picker, derives a likely consumer, or keeps a second Tier inventory. Assignment lives in the `package-family` drawer's capability shell; Rate Sheet binding in the `tier` drawer's overview picker.

## Required structure

```text
Settings
├── Focused Tier System
│   ├── Access          → Rate Sheet Access
│   └── Tier Structure  → Fixed Tier Slots
└── Package Manager
    ├── Families        → Create Family      → `package-family-create` drawer
    ├── Tiers           → Create Tier        → `tier` drawer, registration address
    └── Rate Sheets     → Create Rate Sheet  → `rate-sheet` drawer
```

Groups has no entry: a group is stored inside `rate_sheets[].groups[]`, so it has no pool and no address apart from the sheet holding it, which the Rate Sheet drawer already authors. A fourth entry could only re-open that same drawer.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) is the shell and the one place the section tree is declared. It owns a single open-section id; the leaf heading is rendered by the shell, so a section cannot advertise one hierarchy and present another.
- [TierSettingsNav.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSettingsNav.tsx) is a second control over that same id, not second state. Each item is a button carrying `aria-controls`, `aria-expanded`, and `aria-current`; opening moves focus to the section's own header.
- [DeckDisclosure.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx) is the shared WAI-ARIA disclosure, also used by the Connections lane. Settings passes `open`, `onToggle`, `idPrefix`, and `headingLevel={5}`; Connections uses the uncontrolled form.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders Rate Sheet Access and Fixed Tier Slots in the deck's row grammar. Access writes the focused instance's own `allowed_rate_sheet_ids` through `useTierInstances.updateInstance`; an empty allow-list means every active sheet, and an allowed id that no longer resolves is listed by that id as unresolved rather than dropped. At least one active sheet must stay allowed. Slots report the stored slot key plus the occupant's own label, `occ_…` id, status, and bound sheet; occupied slots offer View/Edit into the `tier` drawer and empty slots offer only Configure.
- The Package Manager launchers live in the shell, as a `PoolLauncher` per subject dispatching a `PoolSubject`. Nothing else crosses that edge, because there is no record yet. `PackageTierWorkspace.dispatchPoolIntent` maps the subject to a registered intent (`create-package-family` → `package-family-create`, `register-tier` → the binding's own `tier` drawer at `tier-register:`, `create-rate-sheet` → `rate-sheet`), all in `view` mode, forwarded down the same `TierLowerDeck` chain as `onTierAction`. Settings offers no Family when it registers a Tier system, because it pre-selects nothing from what is focused above it.
- Settings holds no creation form at all. `PackageManagerSettings.tsx` is gone; see [Tier System Registration](tier-registration.md) for the `tier` drawer's registration address.

## Invariants

- Settings creates nothing: no endpoint, draft, id or save for a pool record, and no second writer of the Package Manager document beside the drawers that own those writes.
- No creation action assigns, binds, grants access, fills a slot, or pre-selects the focused Family.
- There is no free-standing group pool and no Groups launcher; the sheet holding a group is the only place it can be authored.
- Every row and every creation result is addressed by a stored id, never a label.
- Empty and unresolved states fail closed: an absent record is reported absent, never substituted.
- Styles use the `--station-*` token family only, through `cz-tier-settings__*` and the deck's own classes.

## Validation

Run `npm run contract:package-tier-workspace`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `php tests/tier-capability-invariants.php`, `php tests/package-manager-schema.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Admin Station Styles](admin-station-styles.md).
