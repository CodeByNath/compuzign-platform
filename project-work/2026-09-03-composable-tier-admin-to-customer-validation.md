# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — PHASE 0 CLEAN RESET**
- Auditor verdict: **Stop — architectural risk**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3`
- User direction dated 2026-09-04 overrides the prior hybrid finalisation design.

## New architecture direction
There must be **one active customer journey only: Upgrade your plan/build**.

Standalone **Build Your Own** is deferred to a later phase and must be disabled from the working route. Leave a clear source comment/TODO that standalone Build Your Own is intentionally disabled for the next phase. Do not route into it, fall back to it, relabel into it, or reuse its state transition after finalisation.

The current problem came from forcing Upgrade and standalone Build Your Own through one shared pipeline. Stop extending that hybrid design.

## Phase 0 — clean up first, no new feature implementation yet
Before building the unified Upgrade route, remove the recent bridge/correction machinery that exists only to convert an Upgrade journey into standalone Build Your Own or repair consequences of that conversion.

Audit and remove/simplify the relevant additions from the Upgrade Finalisation series (including `4e2188f2`, `528f7295`, `eaead453` and related reverted/self-correction remnants) **surgically**, not by reverting unrelated product work. Preserve the already-working composable offer browsing, server-resolved pricing, customer selection/quantity controls, normal Tier/Edition base, add-ons, Rate Sheet ownership, Commercial Legs, and unrelated UI fixes.

Specifically remove the Upgrade -> Build Your Own transition assumptions such as final composed-item conversion, context flipping into `build_your_own`, `composedBase`/`composedUpgrade` machinery where it exists solely for that conversion, post-finalise clobber guards, and presentation patches that only compensate for the hybrid final item. Do not remove shared primitives still required by the Upgrade browser without proving they are hybrid-only.

Do **not** rewrite Git history. Produce a clean forward correction from current main.

## Required end state of Phase 0
- Existing normal Tier/Edition + Upgrade selection remains usable up to the current pre-finalise state.
- No customer action can enter standalone Build Your Own.
- No Upgrade action transforms the plan into a Build Your Own item.
- Standalone Build Your Own route is explicitly disabled/commented for next phase.
- No new unified Upgrade finalisation behavior is implemented yet; Phase 0 is cleanup only.

## Claude report back
Return the exact files/logic removed, what was preserved, tests/contracts affected, source commit, and any remaining hybrid coupling found. Push only to the review branch and set **AWAITING CHATGPT REVIEW**. Do not push to `main` until audited.