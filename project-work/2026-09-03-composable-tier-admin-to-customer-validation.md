# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — PHASE 0 CLEAN RESET**
- Auditor verdict: **Stop — architectural risk**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3`
- User direction dated 2026-09-04 overrides the prior hybrid finalisation design.

## Architecture direction
There is **one active customer journey only: Upgrade your plan/build**.

Standalone **Build Your Own** is deferred. Disable it from the working route with a clear source TODO for the next phase. Upgrade must never fall through, relabel, or transition into Build Your Own.

The prior mistake was forcing Upgrade and standalone Build Your Own through one finalisation pipeline. Stop extending that hybrid design.

## Platform identity / occupant rule — mandatory
Claude must use the **CompuZign Platform skill** before implementing this identity work, because this extends the platform ecosystem.

The system already has Tier/Edition occupant identity and lifecycle pipelines. **Reuse those same pipelines. Do not create a parallel entity, allocator, persistence model, or resolver path.** Upgrade and future Custom/New Build are distinct occupant variants with their own Platform IDs and normal sortable ordering.

Tier occupant identity classes:
- Default Tier: `CZT...`
- Upgrade occupant: `CZTUXXXXX`
- Future Custom/New Build occupant: `CZTCXXXXX`

Edition occupant identity classes:
- Default Edition: `CZTE...`
- Upgrade occupant: `CZTEUXXXXX`
- Future Custom/New Build occupant: `CZTECXXXXX`

Rules:
- Existing occupant/native identity remains the foundation; add the new Platform-ID class through the established Platform Identifier/occupant pipeline.
- Upgrade derived from a Tier uses `CZTU`; Upgrade derived from an Edition uses `CZTEU`.
- `CZTC` / `CZTEC` are reserved for the later standalone Build Your Own phase and must not be minted or routed now.
- Upgrade/Custom occupants must participate in the same established occupant ordering/sort pipeline rather than introducing a special ordering system.
- Do not reuse the base `CZT` / `CZTE` Platform ID for an Upgrade result.

## Phase 0 — clean reset only
Before implementing the unified Upgrade route, surgically remove the recent machinery that exists only to convert Upgrade into Build Your Own or repair consequences of that conversion. Audit the series around `4e2188f2`, `528f7295`, `eaead453` and related reverted attempts; do not rewrite Git history or revert unrelated work.

Preserve working composable browsing, server-resolved pricing, selection/quantity, normal Tier/Edition base, add-ons, Rate Sheet ownership, Commercial Legs, occupant identity/lifecycle infrastructure, and unrelated UI fixes.

Remove hybrid-only assumptions such as Upgrade -> Build Your Own conversion, context fallback into `build_your_own`, composed peer machinery used solely for that conversion, post-finalise clobber guards, and presentation patches that only compensate for the hybrid result. Shared primitives stay unless proven hybrid-only.

## Phase 0 end state / Claude report
- Normal Tier/Edition + Upgrade selection still works up to pre-finalise state.
- No customer action enters Build Your Own; no Upgrade becomes Build Your Own.
- Build Your Own is explicitly disabled/commented for next phase.
- No `CZTC`/`CZTEC` minted yet; no new Upgrade finalisation implemented yet.
- Report exact removals/preservations, Platform-skill findings on the existing occupant/Platform-ID/sort pipeline, affected tests/contracts, source commit, and remaining coupling.
- Push only to the review branch and set **AWAITING CHATGPT REVIEW**. Do not push to `main` until audited.