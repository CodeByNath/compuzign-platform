# Platform Identifier Station Implementation Roadmap

**Status:** Temporary live Service/Category migration deployed; dry check and assignment pending
**Contract authority:** `src/PlatformIdentifier/` and `tests/platform-identifier-station.php`

## Locked contract

`PlatformIdentifierStation` is backend Platform infrastructure composed once
and consumed by owning domains. It owns only permanent identity: policy,
generation, atomic reservation, assignment, ensure, lookup, tombstones,
conflicts, and bounded existing-record assignment. Owners retain native record
creation, persistence, lifecycle, validation, projection, and deletion rules.

Registry records are non-autoloaded per-identifier and per-native WordPress
options. Entity storage remains authoritative. Native references are
`int|string` because later Package/Tier/Rate Card owners are not assumed to be
WordPress posts or terms. Platform IDs are output-only and never recycled.

| Entity type | Prefix | Owner confirmed for integration |
| --- | --- | --- |
| `service` | `CZS` | Service Station / `Modules/Service` |
| `category` | `CZC` | Category / `Modules/Admin` |
| `package_family_group` | `CZPG` | Package Station / `Modules/SurfacePackages` |
| `tier_group` | `CZTG` | Pending Phase 5 source audit |
| `tier` | `CZT` | Package Station / instance-qualified occupant reference approved |
| `tier_addon` | `CZTA` | Pending Phase 6 source audit |
| `tier_promotion` | `CZTP` | Pending Phase 7 source audit |
| `package_rate_card` | `CZPRC` | Pending Phase 8 source audit |
| `package_rate_card_group` | `CZPRCG` | Pending Phase 9 source audit |
| `package_rate_card_item` | `CZPRCI` | Package Station / `(rate_sheet_id,item_id)` |
| `package_rate_card_item_option` | `CZPRCIO` | Package Station / `(rate_sheet_id,item_id,option_id)` |

Every prefix receives five characters from
`23456789ABCDEFGHJKMNPQRSTVWXYZ`. Forward records use
`cz_platform_identifier_v1_{platformId}`. Reverse records use
`cz_platform_identifier_native_v1_{entityType}_{sha256(typed native ref)}`.
States are only `reserved`, `bound`, `retired`, and `deleted`.

## Phases

1. **Contract and engine — complete.** Added the closed policy, value/results,
   cryptographically secure generator, atomic registry, immutable assignment,
   ensure/repair, resolution, tombstones, conflicts, bounded batch contract,
   isolated tests, and Code Map. Files: `src/PlatformIdentifier/*`,
   `tests/platform-identifier-station.php`, this roadmap, and Code Map indexes.
   Required test: `php tests/platform-identifier-station.php`.
2. **Service — complete.** Composed one engine in `Core\Plugin`; injected it
   through `ServiceModule` into `ServiceController`; reserve `CZS` before the
   existing `wp_insert_post()` and carry it through `meta_input`; verify/bind
   before existing Service setup; expose output-only identity in authoritative
   projections; reject identity mutation; tombstone successful hard deletion.
   Exact files: `Core/Plugin.php`, `ServiceModule.php`, `ServiceController.php`,
   `ServiceSchema.php`, Service TypeScript contracts/API/state/seed/catalogue
   adapters, focused PHP tests, mounted Service fixtures, generated admin bundle,
   local instructions, and the Service/identifier Code Maps. Identifier and
   lifecycle contracts, PHP lint, TypeScript, catalogue/connection contracts,
   mounted create/handoff/open-save/disable-enable regressions, build, and docs
   pass. The combined route baseline reports only its existing Category status
   argument drift; its Service routes report no change.
3. **Category — complete.** Reused the one engine composed in `Core\Plugin`
   and injected it through `AdminModule` into `AdminCategoriesController`.
   Both existing `wp_insert_term()` paths reserve `CZC`; Station duplicate
   rejection and inline return-existing semantics remain intact. Category
   atomically claims `cz_platform_id` term meta, verifies/binds before its
   existing setup, retires unused reservations, projects output-only identity,
   rejects identity mutation across every write, preserves identity through
   lifecycle/drafts, and tombstones guarded hard deletion. Exact files:
   `Core/Plugin.php`, `AdminModule.php`,
   `AdminCategoriesController.php`, `CategoryMeta.php`, Category API types and
   endpoint adapters, focused PHP lifecycle/inline/race contracts, mounted
   Category fixture, generated admin bundle, local instructions, Code Maps, and
   this roadmap. The locked identifier, Category payload/lifecycle/inline-race,
   TypeScript API, mounted Category, connections, build, lint, and docs checks
   pass. The combined route baseline still reports only its deferred Category
   status-argument fixture drift; no route was changed in this phase.
3A. **Service and Category Platform routes and schema identity — complete.**
   Extended the locked shared `EntitySchema.identity` contract with optional
   `platformIdOf` while preserving numeric `idOf`. Service and Category inject
   their existing application `platformId`; other entities remain unchanged.
   Authenticated `GET /admin/services/{platformId}` and
   `GET /admin/categories/{platformId}` routes resolve through
   `PlatformIdentifierStation`, require a bound matching entity, reject
   tombstones/conflicts/wrong entities, and delegate to each owner's existing
   authoritative detail/projection path. Numeric routes, `recordId`, and mounted
   drawer handoff remain unchanged.
3B. **Existing Service and Category assignment — command complete.** The
   bounded WP-CLI command is limited to these two integrated owners:
   `wp compuzign platform-identifiers assign service --limit=100 --cursor=0`
   or `category`. It returns JSON counts, conflicts, completion, and the next
   cursor; limits are hard-capped at 500. Service uses atomic post-meta claims,
   Category uses its atomic term-meta claim, and reruns preserve valid IDs.
   Execute successive pages in the target WordPress runtime, then verify the
   Phase 3A GET routes with the returned/stored Platform IDs.
3C. **Temporary live migration — active until one-time completion.** An
   authenticated `PlatformAccess::CAP` REST action exposes status, zero-write
   dry-run, and one 100-record Service-or-Category batch per request. Admin
   Station shows one temporary notice, automatically dry-checks, blocks on any
   conflict, and requires the explicit `Assign Platform IDs` action. Progress
   and completion use non-autoloaded `cz_platform_identifier_migration_v1`;
   each batch uses a 45-second atomic option lock. Remove the temporary REST/UI
   wiring after live verification; retain assigned IDs, bindings, completion,
   WP-CLI, owner routes, and schema identity.
4. **Package Family Group — new-record integration complete.** Package Family
   now conforms to Overview-Save creation, same-mounted returned identity,
   existing-record Publish, and explicit Disable/Enable masking. New Families
   reserve and bind `CZPG` to Package-owned string `group_id`, store the scalar
   in `category_groups[]`, project it output-only, reject mutation, and tombstone
   guarded hard deletion. The approved authenticated read route is
   `GET /admin/package-families/{platformId}`. Bounded existing-record
   assignment is available through the existing WP-CLI command's
   `package-family` selector, with stable string `group_id` cursors, a default
   limit of 100, and a hard cap of 500. Package
   Station remains pending overall because every other Package entity is unchanged.
5. **Tier Group — integrated.** Package Station owns the
   `tier_instances[]` row, stored scalar `cz_platform_id`, and native
   `tier_instance_id`, creation binding, read, assignment, and deletion tombstone.
6. **Tier and Tier Add-on — integrated.** The primary Tier
   identity is `tier/CZT`; the optional secondary identity is
   `tier_addon/CZTA`. Both use the same canonical instance-qualified
   `(tier_instance_id, occupant_id)` native reference and travel with the whole
   occupant record, including travel and permanent-deletion tombstones.
7. **Tier Promotion — pending owner/storage audit.** No files locked yet.
8. **Package Rate Card — integrated for Rate Sheet.** The native reference is
   `rate_sheet_id`; existing lifecycle is unchanged.
9. **Package Rate Card Group — integrated for Rate Sheet
   Group.** The native reference is instance-qualified
   `(rate_sheet_id, group_id)`; existing lifecycle is unchanged.
10. **Package Rate Card Item — integrated for Rate Sheet inclusion rows.** The
    native reference is `(rate_sheet_id,item_id)` and deliberately excludes
    mutable `group_id`. Rows preserve identity through pricing, quantity, unit,
    ordering, and regrouping changes; row removal tombstones only that row, and
    Rate Sheet deletion orchestrates child row tombstones before the sheet.
11. **Existing-record assignment — Package Family complete.** Service,
    Category, and Package Family are enabled. Later entity types remain
    unavailable until their owner integrations and lifecycle contracts are
    complete.
12. **Final verification/documentation — pending.** Cross-entity resolution,
    immutability, lifecycle, deletion, importer, projections, mounted
    regressions, TypeScript, Code Maps, and clean-tree verification.

## Phase ledger

| Phase | Result | Commit | Blockers / deferred work |
| --- | --- | --- | --- |
| 1 | Contract and isolated engine complete; isolated PHP and documentation checks passed | `ac0067a` | Domain composition and all entity integration deliberately deferred |
| 2 | Service creation, projection, immutability, lifecycle preservation, lookup binding, and deletion tombstone complete | `1ece5e6` | Existing-record assignment remains Phase 11. The combined route baseline has unrelated pre-existing Category status-argument drift; the broader module-state snapshot also has an unrelated undefined legacy definition. |
| 3 | Category Station and inline creation, projection, immutability, duplicate-race handling, lifecycle preservation, lookup binding, and deletion tombstone complete | `6647568` | Existing-record assignment remains Phase 11. Deferred route-fixture drift and module-state snapshot failure remain untouched. |
| 3A | Optional additive schema identity and authenticated owner-specific Service/Category Platform-ID reads complete | `03de986`, `0a738c6`, `74a55c5` | Native numeric identity remains authoritative. Deferred route-fixture drift and module-state snapshot failure remain untouched. |
| 3B | Bounded, resumable Service/Category existing-record assignment command and focused contract complete | `ac0be8f` | Run pages and verify Platform-ID GETs in the target WordPress runtime. No local WP-CLI/runtime is present in this repository workspace. |
| 3C | Temporary authenticated dry-run/batch REST action and Admin Station notice ready for live execution | `d87af20`, `056c4bd`, `073215b` | Remove only after conflict-free live completion and route/lifecycle verification. |
| 4 | New-record integration and canonical read route complete | `62f8917`, `a83123e` | Existing Package Family rows require the bounded Phase 11 command to be run in the target WordPress runtime. |
| 11 (Package Family) | Bounded stable-string-cursor assignment complete | this assignment phase | Run successive pages in the target WordPress runtime, review conflicts, then verify the canonical GET route. |
| 5–12 | Pending | — | No Tier, add-on, Promotion, or Rate Card identity integration has begun. |

No Project History document has been created. That decision remains with the
user after the implementation qualifies as a completed major milestone.
