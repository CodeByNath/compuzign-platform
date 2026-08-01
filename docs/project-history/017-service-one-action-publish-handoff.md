# Service One-Action Publish Handoff

## Date

2026-08-01

## Scope

This repair restores the Service drawer's pending-record Publish lifecycle. It changes no Service REST route, backend lifecycle rule, generic drawer renderer, or presentation ownership. The work is confined to the Service Station state authority, its thin drawer controller hand-off, focused mounted regressions, and current-state documentation.

## Goal

A confirmed Publish from a local pending Service must be one complete user action. It must create the real Service, continue lifecycle operations with the returned ID, settle required modules, activate the record, and leave the same mounted drawer immediately usable.

## What Changed

`useServiceStation` now completes the pending Publish transaction as create → settle → activate. It uses the ID returned by creation for the settle and status operations, then seeds `adminDetail` with the final authoritative overview, pools, module status, and platform status before returning the final `ServiceItem` to the controller.

`useServiceDrawerController` remains a coordinator. It still replaces its local `null` identity with the returned record, but it neither orchestrates endpoints nor waits for a later render to finish lifecycle work.

A one-shot Service Station handoff marker identifies this specific pending-to-real identity transfer. When the drawer receives that final record, the detail effect retains the already-seeded detail and keeps `detailLoaded` true. Ordinary existing-Service opens still perform their normal detail fetch, so this exception does not weaken their stale-fetch protection.

The mounted Service regressions now prove the complete action through the real drawer composition and Publish confirmation: exactly one create call; settle and activation using the returned ID; active final status with settled Overview; no full loading replacement or hand-off fetch; retained notification/module bindings; immediate Inclusions and FAQs editing; and usable record-footer actions. The existing open-and-save race regression remains in place for normal existing-record detail loading.

## Final Architecture

```text
pending drawer Publish
  → Service Station createService()
      → create Service
      → settle returned Service ID
      → activate returned Service ID
      → final authoritative detail seed
  → controller replaces null identity in the same mounted drawer
```

The Service Station remains the sole Service write and lifecycle authority. The controller owns only local drawer identity and surface coordination; the generic host and presentation components remain endpoint-free.

## Decisions and Invariants

- Publish is one confirmed lifecycle transaction, never a create-only first click followed by another Publish.
- The returned server identity is used for every lifecycle operation after creation.
- Identity transfer must not clear module notifications, editor bindings, footer actions, or input readiness behind a loading state.
- A final authoritative seed is sufficient for the pending Publish hand-off; it does not replace the normal existing-record detail fetch path.
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
