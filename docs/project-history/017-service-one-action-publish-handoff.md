# Service Draft Handoff from Overview Save

## Date

2026-08-01

## Scope

This correction restores the Service drawer's pending-record draft lifecycle. It changes no Service REST route, backend lifecycle rule, generic drawer renderer, or presentation ownership. The work is confined to the Service Station state authority, its thin drawer controller hand-off, focused mounted regressions, and current-state documentation.

## Goal

A complete Overview Save from a local pending Service must create a persisted Pending Service record with its Overview draft, transfer the returned identity into the same mounted drawer, and leave all module editing immediately usable. Publish must remain a later operation that settles pending modules and activates that existing record. Storage uses the fixed `disabled` enum with no disable mask and an `overview: pending` module state; the UI renders that combination as Pending. Explicit Disable is the distinct masked user action.

## What Changed

`useServiceStation` now creates the Pending Service record during a complete Overview Save. It uses the returned ID to build the persisted `ServiceItem` and synchronously seeds `adminDetail` with the authoritative saved Overview draft, pools, and module status before handing that record to the controller. Inclusions and FAQs then persist through their ordinary per-ID endpoints. Publish continues to settle all pending modules and activate the existing Service.

`useServiceDrawerController` remains a coordinator. It still replaces its local `null` identity with the returned record, but it neither orchestrates endpoints nor waits for a later render to finish lifecycle work.

A one-shot Service Station handoff marker identifies this pending-to-real identity transfer. When the drawer receives the persisted Pending record, the detail effect retains the already-seeded detail and keeps `detailLoaded` true. Ordinary existing-Service opens still perform their normal detail fetch, so this exception does not weaken their stale-fetch protection.

The mounted Service regressions prove the complete sequence through the real drawer composition: exactly one create request at Overview Save; no early settle or activation; no full loading replacement or hand-off fetch; retained pending-draft notification/module bindings; immediate persisted Inclusions and FAQs; validation that keeps blank child entries open with inline errors; and later Publish settlement and activation using the same returned ID without a second create. The existing open-and-save race regression remains in place for normal existing-record detail loading.

## Final Architecture

```text
pending drawer Overview Save
  → Service Station creates persisted Pending Service record with its Overview draft
  → Service Station seeds authoritative pending detail
  → controller replaces null identity in the same mounted drawer
  → child modules save with returned Service ID
  → later Publish settles modules and activates that record
```

The Service Station remains the sole Service write and lifecycle authority. The controller owns only local drawer identity and surface coordination; the generic host and presentation components remain endpoint-free.

## Decisions and Invariants

- Overview Save, not Publish, is the creation boundary for a new Service.
- The returned server identity is used for every later child-module and lifecycle operation.
- Identity transfer must not clear module notifications, editor bindings, footer actions, or input readiness behind a loading state.
- A pending-draft authoritative seed is sufficient for the Overview Save hand-off; it does not replace the normal existing-record detail fetch path.
- Child save requests never report success without a real Service ID, and blank inclusion labels or FAQ questions/answers keep their editor open with an inline error.
- No second Service lifecycle system or presentation-owned endpoint orchestration is introduced.

## Validation

Passed: `npx tsc --noEmit`; `npm run regression:service-create`; `npm run regression:service-create-handoff`; `npm run regression:service-open-save-race`; `npm run docs:check`; and `git diff --check`.

Generated `dist` assets were deliberately not rebuilt because the requested repair did not require generated-output changes.

## Deferred Work

None.

## Related History

- [Service Create Hand-off and Disable/Enable Mask](016-service-lifecycle-mask.md)
- [Admin Station Drawer Organisation Pass](010-admin-station-drawer-organisation.md)
- [Service Manager UI and Entity Drawer Integration](007-service-manager-ui-drawer-integration.md)
