# Platform Identifier Station Implementation Roadmap

**Status:** Phase 1 complete in source; awaiting committed phase result
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
| `package_family_group` | `CZPG` | Pending Phase 4 source audit |
| `tier_group` | `CZTG` | Pending Phase 5 source audit |
| `tier_addon` | `CZTA` | Pending Phase 6 source audit |
| `tier_promotion` | `CZTP` | Pending Phase 7 source audit |
| `package_rate_card` | `CZPRC` | Pending Phase 8 source audit |
| `package_rate_card_group` | `CZPRCG` | Pending Phase 9 source audit |
| `package_rate_card_item` | `CZPRCI` | Pending Phase 10 source audit |

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
2. **Service — pending.** Audit and integrate `CZS`; preserve Service routes,
   numeric IDs, drafts, lifecycle, pools, drawer handoff, and importer boundary.
   Expected owners: `ServiceModule`, `ServiceController`, `ServiceSchema`, and
   Service TypeScript endpoint/contracts. Extend Service PHP and mounted tests.
3. **Category — pending.** Audit and integrate `CZC` in Category Station and
   inline creation without changing term identity, lifecycle, or drawer flow.
4. **Package Family Group — pending owner/storage audit.** No files locked yet.
5. **Tier Group — pending owner/storage audit.** No files locked yet.
6. **Tier Add-on — pending owner/storage audit.** No files locked yet.
7. **Tier Promotion — pending owner/storage audit.** No files locked yet.
8. **Package Rate Card — pending owner/storage audit.** No files locked yet.
9. **Package Rate Card Group — pending owner/storage audit.** No files locked yet.
10. **Package Rate Card Item — pending owner/storage audit.** No files locked yet.
11. **Existing-record assignment — pending.** Register the approved bounded
    WP-CLI command only after every completed owner supplies enumeration and
    scalar read/write callbacks.
12. **Final verification/documentation — pending.** Cross-entity resolution,
    immutability, lifecycle, deletion, importer, projections, mounted
    regressions, TypeScript, Code Maps, and clean-tree verification.

## Phase ledger

| Phase | Result | Commit | Blockers / deferred work |
| --- | --- | --- | --- |
| 1 | Contract and isolated engine complete; verification recorded in phase commit | Pending commit | Domain composition and all entity integration deliberately deferred |
| 2–12 | Pending | — | Must follow phase order and audit each real owner first |

No Project History document has been created. That decision remains with the
user after the implementation qualifies as a completed major milestone.
