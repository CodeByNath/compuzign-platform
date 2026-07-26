# Package Home Settings

## Purpose and ownership

Settings is the third lane of the Package Home Tier workspace lower deck. It does two things: it configures the ONE Tier system the workspace has focused, and it creates single Package Manager pool records. Package Station owns every read and write; Admin Station supplies the shell, tokens, icons, and the drawer Settings hands slots to.

Settings makes no relationship — it never assigns a Tier system to a Family, offers a Family picker, derives a likely consumer, keeps a second Tier inventory, or launches another tool. Assignment lives in the `package-family` drawer's capability shell; Rate Sheet binding in the `tier` drawer's overview picker.

## Required structure

```text
Settings
├── Focused Tier System
│   ├── Access          → Rate Sheet Access
│   └── Tier Structure  → Fixed Tier Slots
└── Package Manager
    ├── Families        → Create Family
    ├── Tiers           → Create Tier
    ├── Groups          → Create Group
    └── Rate Sheets     → Create Rate Sheet
```

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) is the shell and the one place the section tree is declared. It owns a single open-section id; the leaf heading is rendered by the shell, so a section cannot advertise one hierarchy and present another.
- [TierSettingsNav.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSettingsNav.tsx) is a second control over that same id, not second state. Each item is a button carrying `aria-controls`, `aria-expanded`, and `aria-current`; opening moves focus to the section's own header.
- [DeckDisclosure.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx) is the shared WAI-ARIA disclosure, also used by the Connections lane. Settings passes `open`, `onToggle`, `idPrefix`, and `headingLevel={5}`; Connections uses the uncontrolled form.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders Rate Sheet Access and Fixed Tier Slots in the deck's row grammar. Access writes the focused instance's own `allowed_rate_sheet_ids` through `useTierInstances.updateInstance`; an empty allow-list means every active sheet, and an allowed id that no longer resolves is listed by that id as unresolved rather than dropped. At least one active sheet must stay allowed. Slots report the stored slot key plus the occupant's own label, `occ_…` id, status, and bound sheet; occupied slots offer View/Edit into the `tier` drawer and empty slots offer only Configure.
- [PackageManagerSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageManagerSettings.tsx) holds the four creation forms. Each reports the created record's stored label and minted id through `role="status"` and returns that record to its caller.
- [usePackageManagerCreation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageManager/usePackageManagerCreation.ts) is the creation authority for Family, Rate Sheet, and group. It adds no endpoint, mints no id, and writes no relationship: Families use the existing `admin/package-category-groups` route; Rate Sheets and groups are edits to the one Package Manager document, mapped by `rateSheetToolModel` and committed through the same `savePackageStationManager` partial upsert the Rate Sheet tool uses. A created record is resolved by the stored id present after the save, never matched by title. Tier creation stays on `useTierInstances.createInstance`.

## Invariants

- No creation action assigns, binds, grants access, fills a slot, or pre-selects the focused Family.
- A Rate Sheet group is stored in `rate_sheets[].groups[]`, so there is no free-standing group pool. Create Group asks which sheet stores it; that is the group's address, not a connection.
- Every row and every creation result is addressed by a stored id, never a label.
- Empty and unresolved states fail closed: an absent record is reported absent, never substituted.
- Styles use the `--station-*` token family only, through `cz-tier-settings__*` and the deck's own classes.

## Validation

Run `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `php tests/tier-capability-invariants.php`, `php tests/package-manager-schema.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Admin Station Styles](admin-station-styles.md).
