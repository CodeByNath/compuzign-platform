# Handover — Platform Global Profile / Brand (2026-10-08)

## Mission and immutable product scope
Introduce **Settings → Profile** as a platform-wide configuration feature, initially accessible inside **Service Station → Settings**. The Service Station is only a temporary entry/display point; it must not own, duplicate or persist the data. Claude is sole product-source Builder. ChatGPT independently reviews. Preserve Service/Package/Rate Sheet/Tier/Pricing/CRM behaviour.

One **Brand** block, in exact order:
1. **Brand logo**: existing WordPress media-library image; preview, Pick, Clear, one-line help. Any image. Intended for public website, not dashboard chrome.
2. **Brand Favicon**: same controls; must be square; reject non-square selection immediately with message and revalidate on Save. Render in dashboard header **64×64**, against main colour.
3. **Brand name**: plain text, maximum 60 characters, optional; full-name contexts use it, otherwise preserve dashboard's existing default label.
4. **Brand Code**: letters A–Z only, displayed uppercase, maximum six characters, no minimum, optional; appears next to favicon in dashboard header; empty uses existing default label.

Image selection changes **unsaved preview** immediately. Clear and blank are valid. **One Save** commits the entire Profile, not each field. After success remain on Profile with confirmation. Only platform-permitted users may open/read/save it. Defaults belong to read/presentation, never silently written as user data. Explicitly define missing media and invalid persisted data fallback.

## Verified authority and starting point
At planning: `main` SHA `8d1f0185811e69214c0fd85c29819eef0c5d9226`; instruction branch `ebd0a427a56128da54b8fc7a947911aea879daa4`.
- `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/000-README.md`, `service-station.md`, `admin-station.md`, `admin-station-navigation.md`, `station-manager.md`.
- Verified `resources/ts/service-station/register.ts`, `resources/ts/admin-station/register.ts`, `resources/ts/admin-station/shell/AdminStationBody.tsx`, `src/Core/PlatformAccess.php`.
- Existing `PlatformAccess::CAP = manage_compuzign`. Its WP `manage_options` compatibility grant exists; do not alter it opportunistically.
- Current menu destinations select Stations; do not invent a URL route or bind platform configuration to a Service record.
- No platform-profile source owner is established by this review: Builder must inspect established settings and storage conventions first.

## Phase plan and mandatory gates
**0 — Discovery / architecture gate (first and ONLY immediately authorized phase).** Read the current Settings lane implementation, Admin shell/header, existing plugin settings storage and REST/auth patterns, WordPress media picker handling, public image/brand consumers, related local instructions and tests. Report *exact* proposed global owner, storage key/schema, API routes, permission/media-access design, rendering path, defaults, atomic-save semantics and affected files. Confirm new code map ownership. **No product implementation before Reviewer approval.** Check three-branch cap: stale `tier-inclusion-unit-price-copy-order` currently points to `main`; Builder verifies ancestry and removes it before a new topic branch.

**1 — Platform-owned backend.** Establish exactly one global persistence authority through existing WP/plugin patterns (do not create Service post/meta). Authenticated platform Profile read/save, capability gate, nonces/REST handling, sanitization and validation. Store media attachment IDs; verify attachment really is image; validate actual favicon dimensions at selection (client) and on save (server). Reject an invalid write without partial changes. Include clear/unset and null/blank semantics. No user-role provisioning or broad capability changes.

**2 — Profile UI within current Settings.** Add Profile entry and one Brand block; images have preview, Pick, Clear, help; text has help; immediate draft-only preview, uppercase/code restrictions, error messages, dirty-state rules, one Save, in-place success. Respect existing dark/light styles and design primitives. Ensure unauthorized user cannot access screen/API. Avoid new Service or drawer data ownership.

**3 — Header and public consumption.** Integrate saved favicon into 64×64 header box on main colour; Brand Code beside it; full brand name only where currently applicable. Empty or invalid values fall back to established dashboard labels. Brand logo is public-facing and excluded from dashboard header. Connect only existing real public consumers; if none exist, expose a documented safe read seam and explicitly defer inventing new public UI.

**4 — Contract checks, release and live acceptance.** Builder tests persistence/reload, single transaction/no partial update, permission denial, cross-user and cross-Station consistency, media attachment and square validation (both times), allowed blanks, text lengths/letters/case, previews, header defaults, no pricing regressions and light/dark responsive layout. Update only affected Code Maps/local instructions. Push topic candidate; Reviewer independently audits exact diff and tests. Only approved SHA moves to `main`; verify Actions deploy. Nath performs live browser check; Reviewer closes only when source/CI/deployed runtime/live behaviour agree.

## No-diversion list
No WEX adapter implementation, WEX source changes, new Station, generalized global settings framework, theme redesign, new user management/permissions regime, custom media storage, profile per Service or per user, pricing/package/quote modifications, background autosave, new public site sections, or unrelated refactors. WEX can consume the eventual platform data via a separately governed later adapter task.

## Cycle and handoff protocol
One active work file: `project-work/2026-10-08-global-profile-brand.md`. Keep phase reports, verdict, exact branch/SHA and bounded corrections in **that same file**, normally <=600 words. Each phase requires Reviewer acceptance before advancing. Product source is read-only to Reviewer. Live validation belongs to Nath. Handover never self-authorizes implementation outside the currently active phase.
