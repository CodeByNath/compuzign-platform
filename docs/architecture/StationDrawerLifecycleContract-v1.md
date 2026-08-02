# Station and Drawer Lifecycle Contract — v1

**Status:** Current platform contract — locked
**Scope:** Station identity, modules, drawer composition, record footer actions, lifecycle travel, pills, notifications, and child-module availability
**Current authority:** This document, the owning Station source, and the current [Code Map](../code-map/000-README.md)

This is the platform rule for adding or changing a Station, module, drawer, or
drawer footer. It records the behaviour now proven by Service, Service
Category, Package Family, Tier occupant, and Tier Add-on. Tier Group / Tier
System, Rate Sheet, Promotion, and the remaining Package surfaces stay outside
this promotion and retain their explicit current-state contracts (see §8).

## 1. Core rule

The owning Station is the only authority for identity, persistence, module
drafts, validation, lifecycle transitions, and notification derivation. A
drawer is a mounted presentation of that Station. It may coordinate identity
handoff and render the footer, but it must not create a second lifecycle or call
an endpoint from presentation code.

For a new conforming record or occupant, a complete Overview Save is the
persistence boundary:

```text
local Overview → create persisted Pending record → returned-ID handoff
→ child edits/saves (where the Station has child modules)
→ Publish settles eligible pending modules and activates the existing record
```

Publish never creates the record. The returned ID is handed into the same
mounted drawer composition. Authoritative detail is seeded before that identity
transfer, so Overview, child modules, notification panels, and the record
footer remain mounted and interactive. A second render, callback, or Publish
click is never required to complete the handoff.

This is a locked AI/contributor rule: a new Station must either implement this
contract or be listed as **pending migration**. It must not introduce a
create-on-Publish path, a replacement drawer during identity transfer, a
presentation-owned endpoint orchestration layer, or a second status/notification
system.

## 2. Vocabulary: storage, module state, and presentation

Storage and presentation are deliberately different.

| Layer | Values | Meaning |
| --- | --- | --- |
| Record travel | `active`, `disabled`, `archived`, `trashed` | Operational values written by the owning Station/backend. |
| Module transition | `not-configured`, `pending`, `settled` | Whether a module has saved draft data or settled data. |
| Drawer resolver | `pending-dim`, `pending-full`, `active`, `disabled` | Five internal presentation keys (the two Pending keys share one label). |
| Pill label | Active, Pending, Disabled | The only drawer/module labels. Archived and Trashed are travel labels on bin/history surfaces only. |

`pending-dim` is reduced-opacity Pending for an empty, incomplete, or not-yet-
available module. Its notification explains the missing prerequisite or next
action. `pending-full` is full-opacity Pending for complete saved data waiting
for publication (or configured data on an unactivated/unmasked record). Its
notification explains that publication is waiting. `active` is settled,
configured, and active. `disabled` is the explicit Disable action's mask.

The raw storage enum `platform_status: 'disabled'` is **not** automatically the
Disabled pill. A newly persisted Service, Category, Package Family, or Tier
occupant is unmasked with a pending Overview; it presents as Pending dim/full
according to readiness. Service, Category, and Family use their documented
mask signal; Tier occupants use authoritative `is_explicitly_disabled`. Only
the explicit Disable action makes the record and every module Disabled. This
distinction prevents a never-published draft from being described as a
user-disabled record.

Every pill is backed by a notification panel when its module has guidance,
errors, or a lifecycle explanation. The pill says only Pending/Active/Disabled;
the panel says why.

## 3. New record and Overview Save

1. The `new` drawer sentinel resolves to `null` (or the Station's documented
   local pending identity), never a fabricated numeric/string record.
2. The drawer opens readable on Overview. The module shell, pill, notification,
   and Edit action are present. An incomplete Overview is `pending-dim`.
3. In Service, child modules are visible but Edit-locked while no Service ID
   exists. Their `pending-dim` notifications say to save Overview first. The
   lock is an availability guard, not a different shell. Category's Assigned
   Services module is a read-only relationship projection and has no child
   editor to unlock.
4. A complete Overview Save crosses the owning persistence boundary exactly
   once. The Station takes the returned record/occupant, seeds authoritative
   detail and module status, then hands the returned identity to the already
   mounted drawer. Tier uses its existing Overview module endpoint; conformance
   does not add a create endpoint or endpoint family.
   There is no full loading mask, remount, or notification unbinding.
5. The saved Overview is `pending-full` with a publication notification. It is
   not settled or active. Service child modules become editable: an empty child
   is `pending-dim` with its add-content notification; a valid saved child is
   `pending-full` and waits for Service publication.

Overview completeness is entity-owned. Service requires its title, category,
and description/content gate. Category requires its name; description is
optional, and saving an empty description is authoritative (settlement removes
the owned description rather than retaining stale text).

### Tier occupant creation model

Tier occupant, including Tier Add-on, uses this exact locked flow:

```text
Empty Tier slot
→ Configure
→ same Tier occupant drawer

First successful Overview Save
→ durable Pending occupant created
→ occupant_id assigned
→ Overview remains draft
→ module_status.overview = pending
→ no CZT
→ no CZTA
→ same drawer remains mounted

Publish
→ settle drafts
→ activate occupant
→ assign CZT
→ conditionally assign CZTA
```

Tier Add-on is the same Tier occupant plus `is_addon = true` and an optional
dormant `CZTA` identity. It has no separate drawer, entity lifecycle,
controller, footer, or endpoint family. First Publish assigns `CZT`; it also
assigns `CZTA` when the occupant is an Add-on. A dormant `CZTA` is preserved
and reused if the same occupant later changes role.

## 4. Child modules and false-success prevention

After a real Service ID exists, Inclusions and FAQs save immediately through
Service Station against that ID. Their editors remain open on invalid input:

- Inclusions reject blank labels.
- FAQs reject a blank question or blank answer.

A missing ID is an invalid persistence state, not a successful empty save. The
Station keeps a defensive thrown error even though the Service child lock makes
the state unreachable through the normal drawer. Editors close, clear input,
and show success only after an authoritative write resolves successfully.

Each module remains in one position and one shell. Edit replaces only that
module's readable body with the shared inline editor and Save/Cancel footer;
sibling modules, pills, notifications, and the record footer remain mounted.

## 5. Publish, Disable, Enable, and travel

| User action | Station operation | Result in the mounted drawer/surface |
| --- | --- | --- |
| Publish | Settle every eligible saved module, then activate the existing record. | Settled configured modules become Active/green; an empty or unconfigured child remains Pending dim with its guidance. No create call. |
| Disable | Write the explicit disable mask; do not settle or activate. | Record and all modules show Disabled. |
| Enable | Clear the explicit mask; do not create, settle, or activate. | Configured/pending data returns to its Pending full state; empty children return to Pending dim. Existing drafts/data are preserved. |
| Archive / Move to Trash | Owning Station travel operation (Archive/Trash may be offered by the record footer where legal). | The drawer closes through its guarded terminal path; the record and its pending/settled data remain recoverable according to Station rules. |
| Restore | Bin/archive travel-surface operation, not available inside the drawer. | Returns to the unmasked Pending re-entry state, preserving module data/drafts; it does not auto-activate. |
| Permanently delete | Legal only for a trashed record and guarded by the owning Station's dependency rules. | Removes the record; no drawer or module may fake a successful delete. |

Tier occupant presentation follows the same lifecycle vocabulary:

```text
Incomplete configuration → Pending dim
Publication-ready saved draft → Pending full
Publish → Active
Disable → Disabled
Enable → Pending dim/full according to readiness
Never published → Move to Trash
Previously published → Archive
```

For a local `new` drawer with no persisted ID, Move to Trash is simply discard/
close of local authoring state; it is not a status write against a nonexistent
record. Footer actions remain one shared record-footer grammar, with module
Save/Cancel taking over the footer while an inline editor is open.

## 6. Drawer ownership and footer boundary

The generic drawer host owns chrome, scroll/focus/close behaviour, record
identity transport, and one footer slot. The owning Station supplies the
composition, bindings, module rules, editors, validation, and lifecycle
handlers. Drawer Kit supplies neutral shells, pills, notification panels,
inline editor chrome, and footer rendering; it owns no records or endpoints.

The controller is a thin handoff/coordination layer. It may receive the
returned ID, preserve the mounted composition, select a tab, open a confirm
dialog, and publish the Station's footer intents. Endpoint orchestration stays
in the Station hook or its existing lifecycle authority. Presentation receives
data and handlers only.

## 7. Required contract for new Stations and edits

Before changing or adding a Station, an AI or contributor must read this
contract, the relevant Code Map, local ownership instructions, and the
authoritative source. The implementation must demonstrate:

- one Station-owned lifecycle and one native identity path;
- readable Overview entry with a pill and notification, including empty/new;
- a documented child lock only where no authoritative ID makes a write
  impossible;
- persistence-on-Overview-Save for the compliant Station, returned-ID handoff, and
  authoritative detail seeding before identity transfer;
- draft-preferred module data and explicit validation/error retention;
- Publish as settle/activate of an existing ID, never record creation;
- explicit Disable/Enable masking with Pending re-entry;
- travel and permanent-delete guards owned by the Station;
- one shared drawer/module/pill/notification/editor/footer system; and
- mounted regression coverage for identity continuity, notification continuity,
  input availability, footer actions, and the absence of a second click.

If the source does not yet meet one of these points, mark the Station and its
  Code Maps **pending migration** instead of copying conforming-entity claims.

## 8. Conformance and pending inventory

### Conforming now

- **Service:** `service-station.md` and
  `service-catalogue.md`; Service Overview Save creates the persisted Pending
  Service, preserves the mounted handoff, unlocks child saves, and Publish
  settles/activates the returned ID.
- **Service Category:** `categories.md`; Overview Save creates the persisted Pending
  Category, preserves the mounted handoff, keeps Assigned Services read-only,
  and Publish settles/activates that ID.
- **Package Family:** `package-station.md`; Overview Save creates the persisted
  Pending Family with native and `CZPG` identity in the same mounted drawer.
- **Tier occupant:** `tiers.md`; first successful Overview Save creates the
  durable Pending occupant with `occupant_id`, preserves the mounted drawer and
  pending Overview draft, and leaves Publish to settle, activate, and assign
  `CZT`. Its shared modules, pills, notifications, inline editors, and canonical
  footer follow the locked grammar, including Disable/Enable, pre-publication
  Move to Trash, and post-publication Archive.
- **Tier Add-on:** `tier-addon.md`; the exact same conforming Tier occupant with
  `is_addon = true` and optional dormant `CZTA`. First Add-on Publish assigns
  `CZTA` alongside `CZT`; it adds no drawer, lifecycle, controller, footer, or
  endpoint family.
- **Shared drawer ownership:** `drawer-system.md` and
  `admin-station-drawer.md`; the host is generic and the Station is the write
  boundary.

### Pending migration — current source/docs intentionally differ

These are not evidence that the contract is optional. They are the explicit
follow-up inventory and must not be described as conforming until migrated:

- **Tier Group / Tier System registration:** `tier-registration.md`,
  `package-settings.md`, and `package-station.md` retain their separate
  aggregate registration and Publish/Apply lifecycle. This promotion covers
  fixed-slot occupants and Add-ons only; it does not promote Tier Group / Tier
  System.
- **Tier inclusion and Rate Sheet tools:** `rate-sheet.md`,
  `tier-rate-sheet-connections.md`, and the Package drawer maps describe
  relationship/collection editors with their own readiness and travel
  semantics; they have not completed this drawer-module migration.
- **Package capability blueprint:** `PackageCapabilityAssignments-v1.md` is a
  current accepted Package execution blueprint, not evidence that its Family
  and Tier surfaces have adopted this lifecycle contract.
- **Promotion authoring:** `promotions.md` records that its Admin drawer is
  absent and its lifecycle remains Package-owned; it is pending a compliant
  mounted drawer.

### Historical or superseded records that intentionally retain older wording

Immutable history/specification records are not rewritten. Their older claims
(for example restore landing directly in Disabled, or the former Service
CreateStep/Locked-step composition) are historical evidence, not instructions:

- `StationLifecycleEngine-v1.md`
- `AdminWorkstationDrawerPrinciples-v1.md`
- `ServiceDrawerModuleArchitecture-v1.md`
- `DrawerModuleSystem-v1.md`
- `PlatformEntityOnboardingGuide-v1.md`
- `CompuZignArchitectureADR-v1.md`
- `S6-CategoryOnboardingBlueprint-v1.md`
- `docs/project-history/016-service-lifecycle-mask.md`
- `docs/project-history/PackageCategoryGroups-v1.md`

The current Code Maps and this contract override those recorded paths and
pre-migration lifecycle descriptions. [Project History](../project-history/000-README.md)
remains immutable.

## Related current maps

[Service Station](../code-map/service-station.md) ·
[Service Catalogue](../code-map/service-catalogue.md) ·
[Categories](../code-map/categories.md) ·
[Drawer System](../code-map/drawer-system.md) ·
[Lifecycle and Module State](../code-map/lifecycle-system.md) ·
[Package Station](../code-map/package-station.md) ·
[Tiers](../code-map/tiers.md) ·
[Tier Add-on](../code-map/tier-addon.md)
