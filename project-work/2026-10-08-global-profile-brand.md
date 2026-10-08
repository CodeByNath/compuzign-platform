# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — design plan below, no source changes made.**
Builder Claude; Reviewer ChatGPT.

## Cleanup (reviewer-accepted)
`main` `8d1f0185`; topic `global-profile-platform-settings` reverted to `125502d9`, identical tree to `main`. Closed.

## Design plan

**1. Responsibilities / separation.** Account Station is a new peer Station registered through Station Manager exactly like Service (`register.ts`: navigation, destination, data source, presentation kit, drawer). It owns only its own four singleton records and their fields — never WordPress users, auth, or login. Settings, Tools, Profile are **not** Stations; they are nested records inside Account Station's own domain, same as Category relationships live inside Service. Admin Station hosts one new nav destination ("Account"); Station Manager resolves it to Account Station's Home/Drawer exactly as it does for Service.

**2. The four records.** Each level — Account Station, Settings, Tools, Profile — is a genuine singleton: exactly one of each will ever exist on this install. Each gets its own Platform ID (`CZA…`/`CZAS…`/`CZAST…`/`CZASTP…`) bound through the existing `PlatformIdentifierStation`, with an explicit `parent_platform_id` chaining each to the level above (Composition/Identity invariant: each is a real, addressable node, not a label). Bootstrap is one idempotent chain — reserve/bind Account Station, then Settings, then Tools, then Profile, in order, resuming from whichever step last completed rather than re-minting on a retried/interrupted first Save. Native references are fixed constants (one per singleton, e.g. `account-station:singleton`), the same style already proven for `CZS`/`CZPG` native keys — no code is revived from the reverted candidate, only this already-established minting shape.

**3. Storage.** One non-autoloaded WP option holds the whole tree: four records' `{platform_id, parent_platform_id, created_at}` plus Profile's own field data (Brand: logo, favicon, name ≤60, code A–Z ≤6). No new database, no ACF, no generic CAS engine — same convention as every other WP-option-backed Station record.

**4. API.** Authenticated routes under `compuzign/v1`, same gate pattern as `ServiceController`: `GET /admin/account-station` (returns the bound tree + Profile fields, bootstrapping on first read if unbound) and `POST /admin/account-station/profile` (validates and saves Brand fields atomically, single Save, no partial write on a rejected image).

**5. Lifecycle contradiction — flagged, not resolved by me.** Profile is a true singleton: there is never a "new" vs "existing" Profile, so Overview/Pending/Publish/Disable/Enable/Archive/Trash (§1–5 of the Lifecycle Contract) do not apply — there is nothing to publish or disable. Recommend Account Station be documented from day one as **intentionally outside** that lifecycle promotion (not "pending migration," since it will never adopt Publish/Disable — it has no draft/active distinction at all), with one lifecycle of its own: unbootstrapped → bootstrapped → saved. Reviewer: confirm this reading before any drawer/footer code is written, since §12's footer grammar (split/Publish) has no action to bind to here.

**6. Files (smallest set).** Backend: `AccountStationModule.php`, `AccountStationController.php`, `AccountSchema.php`, `AccountStationIdentity.php` (bootstrap), `AccountStationRepository.php`. Frontend: `register.ts`, `api.ts`, `useAccountStation.ts`, one Brand editor component. One Code Map (`account-station.md`, ≤600 words). Each source file ≤600 lines; no speculative second Profile section scaffolded yet.

**7. Validation / no-dead-code.** Validate Brand fields at the controller boundary only (name length, code charset, image decode) — no client-side duplicate rule set. No speculative Tools/Profile sibling sections, no unused imports, no resurrected PlatformSettings file.

No source written. Reviewer: confirm the four-record model, storage shape, and the lifecycle-exemption reading in part 5 before implementation begins.
