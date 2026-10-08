# Global Settings → Profile / Brand

## Status
**READY FOR BUILDER** — Phase 0 discovery only.
Builder: Claude (VS Code). Reviewer: ChatGPT. Owner/live validator: Nath.
Verdict: **Proceed with safeguards** (planning only).

## Authority and complete scope
Read `project-work/AGENTS.md` and companion [handover + locked multi-phase plan](2026-10-08-global-profile-brand-handover.md), then root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and actual `main` source. Do not implement from chat memory.

Requested path: **Service Station → Settings → Profile**, but configuration has **platform-wide ownership and persistence**. One Brand block: logo; square favicon; name <=60; uppercase letters-only code <=6; media preview/Pick/Clear; help per field; one Save; blank/clear valid; platform permission; remain on screen with confirmation. Header uses 64×64 favicon and code; dashboard defaults for blank name/code; public logo never in dashboard.

## Baseline / branch prerequisite
Planning `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Only three branches allowed. Existing `tier-inclusion-unit-price-copy-order` points to `main`; authorized Builder must verify merged ancestry and remove stale branch before creating a topic branch. Reviewer must not manipulate branches.

## Current authorized task — Phase 0 only
1. Inspect actual Settings presentation, global storage conventions, APIs, `PlatformAccess::CAP`, media-library capability and square-dimension checks, Admin header and possible public consumers.
2. Map single authoritative global profile owner and data schema, REST permissions, atomic save and fallback behaviour; show exact code files and tests to change.
3. Identify WordPress media access for `cz_platform_manager` without broadening unrelated permissions.
4. Record proposal, unknowns, compatibility risks and evidence in **this work file**; set `AWAITING REVIEWER REVIEW` and stop. **No product code changes during Phase 0.**

## Subsequent phases (not yet authorized)
1. Platform-wide persistence + secured read/save.
2. Profile UI and Settings entry.
3. Header/public consumption with defaults.
4. Tests, independent source review, approved production push, deploy evidence and Nath live validation.
See companion handover for exact acceptance checks and exclusions.

## Immutable exclusions
No Service-owned profile data, WEX implementation, new Station/framework, autosave, new public pages, or changes to pricing, Tier, quote, Package, lifecycle or customer flows.

## Reviewer handoff
Reviewer audits Phase 0 report and records **Proceed**, **Proceed with safeguards**, or **Stop — architectural risk** here; only then authorizes Phase 1. At code phases Builder pushes only the topic branch, records exact SHA and `AWAITING REVIEWER REVIEW`; Reviewer independently checks and sets `SOURCE PUSH APPROVED` or `SOURCE PUSH NOT APPROVED`. Builder deploys only approved SHA; Nath validates live; Reviewer closes from evidence.
