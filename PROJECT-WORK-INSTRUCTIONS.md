# CompuZign Project Work Instructions

## Purpose and Rule-Layer Separation

This document coordinates work between Nath, ChatGPT (independent auditor), and Claude Code.

These are workflow and governance instructions only. They are not CompuZign Platform architecture or product rules.

- Claude Code in VS Code is the only source-code editor.
- ChatGPT acts as independent auditor and devil's advocate.
- Source implementation remains read-only to ChatGPT.
- The only coordination exception is this file, `PROJECT-WORK-INSTRUCTIONS.md`, and only on branch `Project-work-instructions`.
- ChatGPT must never write this document to `main`.
- ChatGPT must never modify any other file on `Project-work-instructions`.
- ChatGPT must never merge branches or push production code.
- Workflow rules in this document must never be treated as product architecture, and product architecture must never weaken the source read-only boundary.

## Repository and Validation Boundaries

- Repository: `CodeByNath/compuzign-platform`
- Production branch: `main`
- Coordination branch: `Project-work-instructions`
- WordPress runtime/storage: Hostinger
- Deployment path: local Git -> `main` -> GitHub Actions -> Hostinger
- Claude edits the local repository in VS Code.
- ChatGPT cannot see Claude's uncommitted local changes unless Claude supplies a diff/report or pushes a commit.

Never confuse these states:

1. Local work
2. Reported local work
3. Pushed GitHub state
4. Workflow-complete state
5. Deployed Hostinger state
6. Live runtime state

## Coordination Workflow

1. Nath and ChatGPT agree on the next work in chat.
2. ChatGPT writes the agreed instruction into `PROJECT-WORK-INSTRUCTIONS.md`.
3. Nath tells Claude to pull/read the document.
4. Claude audits or implements locally.
5. Claude updates the report section in the same document and pushes that document to `Project-work-instructions`.
6. Nath and ChatGPT review Claude's report, ask questions, approve it or record corrections in the document.
7. Source work stays local until Nath approves its push.
8. After approval, Claude pushes the approved source work to `main`.
9. Claude updates the coordination document with:
   - Full production commit SHA
   - Complete commit message
   - Date/time
   - Files included
   - Implementation comments
   - Tests/build results
   - GitHub Actions result
   - Deployment information
10. ChatGPT audits the pushed GitHub commit and validates the live Hostinger site through the browser.
11. ChatGPT records live approval or corrections in the same document.

Preserve dated review rounds. Never silently rewrite an already-approved instruction.

---

# Phase 8E - Add-on Focused Occupant Parity

## Instruction Status

- Status: `READY FOR CLAUDE`
- Source push: `NOT APPROVED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Instruction recorded: 2026-08-29 (Australia/Brisbane)

## Phase 8D Context

Latest approved production base before Phase 8E:

- SHA: `7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Message: `add tabbed quote details overlay`
- Date: 2026-08-29

Phase 8D introduced:

- `periodsForVariant()` export from `FamilyTierAdapter`
- Reusable `PlanDetailsContent`
- New tabbed `QuoteDetailsOverlay`
- One tab per quoted primary `family_tier` occupant
- Final `Total Commitment` tab
- Per-item and cart-level `View details` entry points
- Full-family resolution for quoted plans
- Exact Edition Platform-ID routing
- Existing Cost Builder behavior preserved

### Completed live Phase 8D audit

Live URL:

`https://compuzign.weerax.com/pricing/`

Passed:

- Single finite KAIROS Starter Cloud
- Multiple finite plans
- Cross-family resolution
- Exact OMNIA Edition 3 routing
- Finite plus ongoing primary-plan cart
- Correct ongoing wording for an ongoing primary occupant
- Exact Commercial Period and payment breakdowns
- Cart entry opens Total Commitment
- Per-plan entry opens the exact plan tab

Deferred secondary observations - do not work on these in Phase 8E:

- Contract Value and Initial Payment use equal visual emphasis, although Initial Payment is intended to be strongest.
- A single-plan cart has two links both called `View details`, although they open different initial tabs.

## Critical Phase 8D Defect Discovered Live

The live audit added the KAIROS add-on:

- `Backup & DR Shield`
- `$580/month`
- `Cancel anytime`

It appeared in the quote list but was excluded from:

- Initial Payment
- Contract Value status
- Total Commitment
- Plan Details tabs

With finite OMNIA Edition 3 + finite KAIROS Starter Cloud + this ongoing add-on, the UI incorrectly showed:

- Total Contract Value: `$215,592`
- Initial Payment: `$4,157`

Correct semantics:

- Contract Value must be `Ongoing`.
- Initial Payment must include the add-on's `$580`.
- The displayed initial payment should be approximately `$4,737`.

This defect establishes the architectural correction below, but Quote Summary totals and Quote Details math remain outside Phase 8E's change boundary.

## Architectural Correction

The original Phase 8D assumption that add-ons lack canonical Plan Details or contract math is wrong.

An add-on is a real Tier occupant.

`is_addon` describes its commercial role only. It does not reduce its capabilities.

An add-on can have:

- Tier occupant Platform identity
- Headline Leg
- Multiple Commercial Legs
- Billing cycles
- Resolved Commercial Periods
- Commitment
- Inclusions and quantities
- Bundles and Extensions
- Editions
- Edition Platform identities
- Edition-specific Commercial Legs
- Exact quoted Default/Edition identity
- Full focused-shell functionality
- Full Plan Details

Therefore, add-ons must ultimately participate in:

- Focused occupant routing
- Exact Edition selection
- Plan Details
- Quote Details
- Total Commitment
- Initial Payment
- Contract Value semantics

However, work one phase at a time. Phase 8E is focused occupant parity only.

## Current Source Audit for Phase 8E

Current source behavior:

- `FamilyTierAdapter.selectVariant()` is structurally capable of focusing any Tier occupant.
- The shared `focusedTier` branch can render an add-on's existing data.
- `PricingTiers.renderAddonTierCard()` does not pass `onChoosePlan`.
- Add-ons therefore bypass focused state and toggle directly through `onToggleAddon()`.
- The focused shell's quote action is currently primary-specific:
  - Exact selection checks `selectedTierId`.
  - Exact Edition checks `selectedTierEditionPlatformId`.
  - `commitSelection()` creates `itemFor(..., false)`.
  - Removal calls `onRemovePrimary()`.
- `PackageBuilderApp` supplies only `selectedAddonTierIds`, which cannot represent an add-on's exact quoted Edition.
- `itemFor()` already resolves active Commercial Legs and creates `legPaymentSummaries`; its `isAddon` argument can preserve the proper occupant role.

Simply passing `onChoosePlan` to the add-on card is unsafe because a focused add-on could replace or remove the primary plan.

## Objective

Give add-on occupants the same existing full focused state as every other occupant.

Do not create a simplified add-on UI or separate resolver.

The only difference is quote mutation:

- Primary occupant replaces/removes the family's primary selection.
- Add-on occupant independently upserts/removes itself.
- Add-on actions must never replace or remove the primary occupant.

## Required Behavior

1. Add-on recommendation cards receive the same focused-shell entry capability as other occupants.
2. Opening an add-on in focus must not mutate the quote.
3. Preserve the shared `TierCard` behavior and established wording.
4. Do not create a parallel add-on CTA system.
5. Determine add-on status from canonical Tier pricing data, not card position, label or index.
6. Render the complete existing focused experience:
   - Occupant/Edition name
   - Ideal-for text
   - Edition cue selector
   - Commercial Terms
   - Upfront payment
   - Commitment
   - Plan Billing
   - Every resolved Commercial Period
   - Every available Commercial Leg component
   - Independent overlapping Leg cards
   - Component notes
   - Inclusion counts
   - Full inclusion list
   - Bundle expansion
   - Extensions
   - Leg-to-inclusion interaction
   - Focused Tier card
   - View Plan Details
   - Full Plan Details
7. Reuse existing paths:
   - `resolveEffectiveTierDisplay()`
   - `periodsForVariant()`
   - Existing Commercial Leg presentation helpers
   - Existing Plan Details
   - Existing `itemFor()` payment-summary construction
8. Carry exact quoted add-on identity, including Edition Platform ID.
9. Do not rely only on `selectedAddonTierIds`.
10. Adding a focused add-on Default or Edition must create `itemFor(..., true)`.
11. Use the existing independent add-on upsert path.
12. Exact selected removal removes only that add-on through its stable Tier Platform ID.
13. Switching Default/Edition A to Edition B replaces only the same add-on.
14. Closing or completing focused add-on selection returns to the selected primary staged view with Recommendations.
15. Preserve primary occupant and Cost Builder behavior.

## Exact Selected-State Rules

- Quoted Default + focused Default -> Selected
- Quoted Edition A + focused Edition A -> Selected
- Quoted Edition A + focused Default -> Not selected
- Quoted Edition A + focused Edition B -> Not selected

## Hard Non-Change Boundary

Do not change in Phase 8E:

- Quote Summary totals
- Total Contract Value
- Initial Payment
- `QuoteDetailsOverlay`
- Total Commitment tabs
- Request/review flow
- Backend resolvers
- WordPress persistence
- Admin behavior
- Commercial Leg schemas
- Primary replacement behavior
- Cost Builder behavior
- Existing focused visual design
- Customer terminology

## Acceptance Tests

1. Unquoted add-on without Editions opens full focus without cart mutation.
2. Adding it from focus adds one `isAddon: true` quote item.
3. The primary item remains unchanged.
4. A quoted add-on reopens on its exact Default/Edition.
5. The exact quoted option shows selected state.
6. Removing it affects only that add-on.
7. Add-on Editions use the normal cue/focused experience.
8. The selected Edition's real Platform ID reaches the quote.
9. Changing Edition replaces only that add-on.
10. Multiple add-ons remain independently selectable.
11. Add-on Legs, Periods, inclusions and Plan Details use the normal occupant paths.
12. Closing focus returns to the primary staged view and Recommendations.
13. Primary occupant behavior remains unchanged.
14. Cost Builder remains unchanged.
15. Relevant tests pass.
16. Production frontend build passes.

---

## Claude Audit / Implementation Report

- Status:
- Updated by:
- Updated at:
- Work type:
- Root cause:
- Files changed:
- Behavior implemented:
- Existing behavior preserved:
- Exact add-on identity path:
- Primary/add-on mutation separation:
- Tests and build results:
- Unresolved risks:
- Questions for approval:
- Source state:
- Local commit, if any:
- Comments:

## Review Round 1

- Status:
- Reviewed by:
- Reviewed at:
- Decision:
- Findings:
- Required corrections:
- Source push approved: NO

## Production Push Record

- Status: NOT PUSHED
- Pushed by:
- Pushed at:
- Full `main` commit SHA:
- Complete commit message:
- Files included:
- Push comments:
- GitHub Actions run:
- Workflow result:
- Deployment result:

## Live Browser Validation

- Status: NOT STARTED
- Validated by: ChatGPT
- Validated at:
- GitHub commit validated:
- Live URL:
- Scenarios checked:
- Result:
- Findings:
- Next instruction:
