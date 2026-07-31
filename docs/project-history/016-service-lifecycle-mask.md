# Service Create Hand-off and Disable/Enable Mask

## Date

2026-07-31

## Scope

This milestone fixed four reported Service Station drawer defects: the Overview module's waiting-for-activation notification disappearing after save during creation; Inclusions and Common Questions erasing whatever was just entered on their first save after a brand-new Service was created; Disable presenting every module pill as Pending instead of Disabled; and Enable republishing/reactivating content instead of restoring the Service's prior state. It did not change Save, Publish, archive/trash, Tier, Package, Category, or Family behaviour, and did not introduce a new lifecycle model — Disable/Enable remain a presentation mask over the existing `platform_status`/`module_status` vocabulary.

## Root Causes

Two of the four defects shared one root cause. `useServiceStation`'s `saveOverview`/`saveInclusions`/`saveFaqs` patched client state via `prev => prev ? patchModuleDraft(prev, …) : prev` — a silent no-op whenever `adminDetail` was still `null`, which is exactly the window between `createService()` resolving and the follow-up `fetchAdminServiceDetail` GET resolving. A save landing in that window was persisted by the backend but its response was dropped client-side, surfacing again only after Publish or a full drawer reopen forced a fresh fetch.

The other two shared a different cause: `resolveOverviewStatus`/`resolveInclusionsStatus`/`resolveFaqsStatus` had no `disabled` branch at all, so a disabled-but-settled module always read Pending; and Enable/Disable were the same `toggleActive` call blindly flipping `platform_status: active ⇄ disabled` — the identical wire shape Publish uses — leaving the backend no way to distinguish "restore what it was" from "activate this content."

## What Changed

| Commit | Outcome |
| --- | --- |
| `c27f37b` | Backend: `action: 'disable' \| 'enable'` request shape on `/status`, kept separate from the legacy `platform_status` path Publish/Archive/Trash still use unchanged. `previous_platform_status` becomes the disable mask. |
| `6df7f56` | Frontend: `createService()` eager-seeds `adminDetail`; the three pill resolvers and the shared notification engine gain an opt-in `disabled` fact; `toggleActive` calls the new endpoints. |
| `de30552` | Backend and mounted-composition regression coverage for both fixes, each verified to fail pre-fix and pass post-fix. |

## Final Architecture — the durable rule

```text
Create      → createService() persists the record AND seeds adminDetail
              synchronously from the same response — no window where a
              module save's response has nowhere canonical to land.
Save        → stores module draft work (module_status: pending).
Publish     → settles pending drafts and activates the Service
              (platform_status: active). The only action that settles.
Disable     → previous_platform_status := current platform_status;
              platform_status := 'disabled'.
              module_status is never written — settled/pending/
              not-configured all survive unchanged.
Enable      → platform_status := previous_platform_status (or 'disabled'
              if it was never set); previous_platform_status := ''.
              Never settles a draft, never activates unpublished content.
Pill        → while platform_status is 'disabled' AND previous_platform_status
              is non-empty ("masked"), every module pill reads Disabled —
              including not-configured ones — ahead of any other state.
              An empty previous_platform_status means the Service simply has
              never been published, and modules read their ordinary
              pending/not-configured/settled state instead.
```

`previous_platform_status` was already declared in `MetaSchema`'s allowed values before this milestone but was only used by archive/trash/restore's `capturePrevious` rule; this milestone gives it a second, independent purpose as the disable mask, read by a fetchDetail addition and threaded through `ServiceMeta`/`ServiceDetail`/`ServiceStatusResponse`/`CreateServiceResponse` on the frontend. The two uses do not collide: `StationLifecycle::restore` always clears `previous_platform_status` on the way back to `disabled`, so a record leaving the bin never carries a stale mask.

## Decisions and Invariants

- Enable is never Publish: it restores a captured status and clears the mask; it never calls settle or writes `module_status`.
- Disable never destroys lifecycle truth: `module_status` is read-only to both actions.
- The `disabled` fact on the pill resolvers and the shared `evaluateModule` notification engine is opt-in per caller; every other station (Category, Package Family, Promotion, Tier) leaves it unset and is behaviourally unchanged.
- The create-hand-off seed does not remove or race the existing follow-up detail fetch — `fetchAdminServiceDetail` still runs exactly once per create, per the pre-existing `regression:service-create` contract.

## Validation

`npx tsc --noEmit`, `npm run build`, and `npm run docs:check` passed. All `tests/*.php` passed, including the new `service-lifecycle-mask.php`. All registered `npm run contract:*` and `npm run regression:*` scripts passed, including the two new ones (`regression:service-create-handoff`, `regression:service-disable-enable`) and the pre-existing `regression:service-create` and `regression:category-create`, confirming no interference with the create flow or a sibling station. Each new test was independently verified via `git stash` to fail against the pre-fix source and pass against the fix.

## Related History

None — this is the first Project History milestone for Service Station's Disable/Enable lifecycle. See [Service Station](../code-map/service-station.md) for the current-state mechanism description.
