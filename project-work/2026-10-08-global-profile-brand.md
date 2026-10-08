# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — bounded correction pushed to topic only.**
Builder Claude; Reviewer ChatGPT. No `main` push/deployment; Phase 2 UI not started.

## Pushed topic
`global-profile-platform-settings` `098999b6` → `1fa3355b` (one commit, 3 files, +118/-4, on top of the already-reviewed Phase 1 candidate — no unrelated files touched).

## Patch, against each remaining condition
1. **Publish rejected pre-bootstrap.** `AccountController::updateStatus()` now checks `AccountRepository::isBootstrapped()` before the Publish transition and returns 422 if the install has no four-node identity yet — a case Service has no equivalent of, since a Service id must already exist before its `/status` route is even addressable. I scoped this fix to Publish only, as asked; see unresolved question below.
2. **Phase 2 compatibility.** Unchanged this round — `settleProfile()`/`updateStatus()` stay independent endpoints, matching Service's `settleModuleRoute`/`settleAll` + status split, so a future `useAccountStation.ts` can call settle-then-activate exactly as `useServiceStation.publishService()` does. Nothing to implement yet.
3. **Draft isolation, proven.** Added: a pending draft saved after a settle (and again while Disabled) never changes `fetchDetail()`'s canonical `brand`, only `drafts.brand`; canonical only moves on an explicit settle call.
4. **Bootstrap robustness, proven.** Three new isolated tests: (a) an interrupted bootstrap (two nodes already bound) resumes and completes only the missing nodes, reusing the existing ones unchanged; (b) a node whose stored parent disagrees with the real chain is rejected by `AccountIdentity`'s existing agreement check, not silently trusted; (c) two concurrent first-Save reservations never collide, and the losing `PlatformIdentifierStation::assign()` call throws and leaves the winner's bind untouched — proving the "harmless unused reservation, no double-bind" claim directly rather than asserting it. **What's still unverified:** these are single-process simulations of concurrency (manual interleaving), not real parallel HTTP requests or WordPress row-level locking; no test exercises actual image upload/attachment creation, only a stubbed `wp_attachment_is_image()`.
5. **Brand/media validation inspected, no deviation found.** Name/Code use plain `sanitize_text_field` + truncation (matches Service's own text-field convention: clean, never reject). The attachment id is a hard existence check via `wp_attachment_is_image()`, rejected closed if invalid — this is an identity/existence check, not a text sanitizer, so the stricter treatment is the correct baseline-consistent split, not a deviation. Nothing changed.

## Tests
`php tests/account-station.php` — 42/42 checks pass (was 28; +14 for this round) against the real controller. `php tests/platform-identifier-station.php` — still fails only on the pre-existing, unrelated `tier_catalogue`/`tier_edition_catalogue` gap on `main` itself, confirmed again by direct comparison; not touched.

## Unresolved lifecycle travel question
Disable/Enable have **no** pre-bootstrap guard — only Publish was named in the remaining conditions, so I left them as-is rather than extending the fix unasked. Today, `action: disable` on a never-bootstrapped install succeeds (writes a Disable mask over an Account Station that has no real identity yet), since `platform_status` defaults to `'disabled'`, which `StationLifecycle::isLive()` treats as live. Flagging for an explicit decision: should Disable/Enable also require `isBootstrapped()`, or is masking a not-yet-existing singleton harmless and intentionally out of scope here?

No source outside `AccountController.php`/the test/the Code Map line noting the fix. `main` unchanged.
