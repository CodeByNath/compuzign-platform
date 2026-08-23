# Platform ID Families

Source of truth: `src/PlatformIdentifier/PlatformIdentifierPolicy.php`.
Read that file directly before relying on this table for anything
load-bearing — it is the only place a prefix is defined, and this file is
a snapshot, not a second source of truth.

Every ID is validated by one anchored regex requiring the **full** string
to be exactly `prefix + SUFFIX_LENGTH` alphabet characters — this is why
prefixes that share a stem (`CZT`/`CZTA`/`CZTE`/`CZTG`/`CZTL`/`CZTEL`,
`CZPRC`/`CZPRCI`/`CZPRCB`/`CZPRCBI`/`CZPRCBIO`) can never be confused with
one another: a longer real ID can never satisfy a shorter prefix's own
pattern regardless of alphabet overlap.

| Prefix | Entity type constant | Native reference shape | Rung |
|---|---|---|---|
| `CZS` | `SERVICE` | numeric post ID | 3 |
| `CZC` | `CATEGORY` | term ID | 3 |
| `CZPG` | `PACKAGE_FAMILY_GROUP` | `group_id` | 3 |
| `CZTG` | `TIER_GROUP` | `tier_instance_id` | 3 |
| `CZT` | `TIER` | `(tier_instance_id, occupant_id)` | 3 |
| `CZTA` | `TIER_ADDON` | same occupant, dormant secondary id | 3 |
| `CZTE` | `TIER_EDITION` | `(tier_instance_id, occupant_id, editionId)` — occupant-qualified, not slot-qualified | 3 |
| `CZTL` | `TIER_LEG` | `(tier_instance_id, occupant_id, legId)`; `legId` is `'default'` or the Leg's own id | 3 |
| `CZTEL` | `TIER_EDITION_LEG` | same, one level deeper under the Edition | 3 |
| `CZTP` | `TIER_PROMOTION` | reserved; no adapter wired yet ("deferred") | — |
| `CZPRC` | `PACKAGE_RATE_CARD` | `rate_sheet_id` | 3 |
| `CZPRCG` | `PACKAGE_RATE_CARD_GROUP` | `(rate_sheet_id, group_id)` | 2 |
| `CZPRCI` | `PACKAGE_RATE_CARD_ITEM` | `(rate_sheet_id, item_id)` | 3 |
| `CZPRCIO` | `PACKAGE_RATE_CARD_ITEM_OPTION` | `(rate_sheet_id, item_id, option_id)` | 2 |
| `CZPRCB` | `PACKAGE_RATE_CARD_BUNDLE` | `(rate_sheet_id, bundle_id)` — coexists with, never replaces, the linked row's own `CZPRCI` | 3 |
| `CZPRCBI` | `PACKAGE_RATE_CARD_BUNDLE_ITEM` | a Bundle's own live reference to one supplied row | 2 |
| `CZPRCBO` | `PACKAGE_RATE_CARD_BUNDLE_OPTION` | the Bundle's own Price Option | 2 |
| `CZPRCBIO` | `PACKAGE_RATE_CARD_BUNDLE_ITEM_OPTION` | a Bundle-inclusion's own Price Option | 2 |

"Rung" here is this Skill's own three-rung classification (see
`identity-composition-model.md`), not a field in the policy itself — it's
included so a new proposal can be checked against precedent directly:
every scoped-child row above (`CZPRCG`, `CZPRCIO`, `CZPRCBI`, `CZPRCBO`,
`CZPRCBIO`) is real, addressable, Platform-identified — and still never
independently reusable outside its parent's own scope.

## How to extend this vocabulary

1. Confirm the new concept is genuinely rung 3 (see
   `identity-composition-model.md`) — rung 2 does not need a new family
   if an existing parent-scoped shape already fits; rung 1 needs none.
2. Add one `const` + one `PREFIXES` entry to `PlatformIdentifierPolicy`.
   Pick a prefix that cannot be confused with an existing one under the
   anchored-full-string rule above (a shared stem is fine; a prefix that
   is itself a valid shorter existing prefix plus ordinary suffix
   characters is not).
3. Build the domain's own `PackagePlatformIdentifierAdapter` (or
   equivalent) — the five callbacks: enumerate, read stored, claim, exists,
   project. Reuse an existing adapter factory pattern
   (`PackagePlatformIdentifierAdapters.php`) rather than inventing a new
   shape.
4. Wire minting at the correct settle/mutation boundary — never on a read
   path.
5. If the new family should be batch-repairable, add it to
   `TemporaryMigrationController::ENTITY_TYPES` and `adapterFor()`, and
   bump the progress/lock option version so an already-`complete`
   install re-runs the dry-run for the new scope. Do not build a second
   repair mechanism.

## Applying this elsewhere in CompuZign

A new subsystem outside Package/Tier/Rate Sheet follows the exact same
five steps above against `PlatformIdentifierPolicy` — the engine is
domain-agnostic by design.
