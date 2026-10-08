# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — revised design below, no source changes made.**
Builder Claude; Reviewer ChatGPT.

## Accepted cleanup and scope
`main` `8d1f0185`; topic `global-profile-platform-settings` reverted to `125502d9`, identical tree. Closed. Account Station is a new peer Station; Settings/Tools/Profile are its own children, not Stations. IDs: `CZA`/`CZAS`/`CZAST`/`CZASTP` + five-char suffix. No WordPress-user/auth ownership.

## Revised design — responds to the five findings

**1. Lifecycle — exact conflict, Owner decision requested (not decided here).** Lifecycle Contract §1/§3 requires Overview Save to persist a **Pending** record, with a separate **Publish** activating it; §5 also expects Disable/Enable/Archive/Trash. The Owner's own Brand spec asks for "one Save… confirmation on same page," with no second Publish step and no sense in which Brand data is ever "unpublished," "disabled," or "trashed" — there is exactly one Profile, always. These two owner-approved instructions conflict with each other, not something I can resolve by picking either side unilaterally. Two concrete compliant paths, for an explicit Owner choice:
   - **(a) Full conformance:** Save persists Profile as Pending (staged, not yet live); a separate Publish settles it to Active (now live on-site). Disable masks the live Brand override back to platform defaults; Enable restores it. No Archive/Trash — a singleton that can never not-exist skips travel actions, same as Tier Add-on skips its own drawer/endpoint family under the contract's precedent for a shaped exception.
   - **(b) Documented exception:** Owner explicitly approves Account Station's Profile as outside §1/§5 (one Save = immediately Active; no Pending/Publish/Disable/Enable/Archive/Trash), recorded in its Code Map as a named, approved deviation — not a new lifecycle I invent quietly.
   I recommend (a): it reuses the existing vocabulary exactly rather than creating anything new, and "staged vs. live Brand" is a real, useful distinction. Awaiting Owner's pick before any Home/Drawer/footer work.

**2. Read/write boundary — fixed.** `GET /admin/account-station` becomes strictly read-only: if unbound, it returns an explicit "not yet created" state (the `new`-drawer-sentinel pattern already used elsewhere), minting nothing. The four-ID bootstrap chain runs only inside the authenticated first `POST /admin/account-station/profile` — i.e., Overview Save creates the record, exactly like Service.

**3. Consistency/recovery.** Each step (reserve/bind CZA → CZAS → CZAST → CZASTP, then write the WP option) is idempotent: before minting, check the option for an already-bound ID at that level; if the option is missing but the registry already holds a binding for that level's fixed native-reference constant, recover by reverse lookup instead of re-minting (reservations/tombstones are never deleted or reused, so this can't double-mint). A short-lived transient lock around the whole first-Save serializes concurrent bootstrap attempts; a losing request fails closed and the client re-reads via GET.

**4. Practical fit.** One native-reference constant per level (e.g. `account_station:root`, `account_settings:root`, `account_tools:root`, `account_profile:root`). Account Station/Settings/Tools carry only identity + parent link today — Settings/Tools are the Owner-specified structural path to Profile, not fields-bearing nodes; future Profile sections (About, Locations…) nest under Profile, never under Settings/Tools directly. One WP option remains sufficient for all four plus Brand fields. Logo/Favicon use WordPress's own media/attachment pipeline, not a bespoke store.

**5. Frontend contracts.** `registerAccountStation()` joins the real synchronous sequence in `modules/admin-station.ts` (`registerServiceStation → registerPackageStation → registerAdminStation → registerPresentationPolicy → finalizeStationRegistry`) before finalize; Admin's `registerPresentationPolicy()` declares its placement by string key, same as every peer. `useAccountStation.ts` is the only caller of the POST endpoint. REST routes reuse the existing `requireAdmin` → `current_user_can(PlatformAccess::CAP)` gate already used by `ServiceController`, not a new capability.

Files/validation/no-dead-code plan unchanged from the prior round. No source written. Reviewer: please return the Owner's choice on finding 1 before implementation begins.
