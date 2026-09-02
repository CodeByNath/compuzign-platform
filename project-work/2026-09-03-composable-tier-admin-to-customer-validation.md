# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — Customer Selection Rules drawer implemented.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production source: `main@28613c0584440420953da81737acd95d35f47f16` (unchanged — not pushed).
- Review branch: `review/composable-tier-admin-customer-policy@a29a93b8` (new branch, base `main@28613c05`).
- Keep all follow-up in this file.

## Verified live state
Studio → Packages → KAIROS — IaaS confirms:
- five normal Tier slots remain unchanged;
- separate subordinate **Build Your Own** card exists below them;
- opening it uses the normal shared Tier occupant editor/lifecycle;
- no customer-policy authoring controls exist yet;
- pricing page correctly shows no Build Your Own while the occupant is empty/unpublished.

## Architecture clarification — locked before implementation
Keep the **normal Tier occupant and composable occupant commercially identical** as far as practical.

The composable occupant itself continues to own the product definition exactly like a normal full Tier occupant:
- Rate Sheet and inclusions;
- authored quantities/Price Options;
- Commercial Legs;
- commitment/headline;
- Editions;
- publish/archive/disable lifecycle.

Do **not** bake customer-composition controls into first-time occupant setup.

After the composable occupant has been created/published through the normal occupant workflow, its **Build Your Own home shell** gets a separate action such as **Customer Options** / **Customer Rules**. That action opens a dedicated drawer/module whose only job is to control customer behaviour over inclusions already owned by that occupant.

The external customer-policy controller/drawer owns only:
- required / optional / excluded;
- optional default-selected;
- fixed vs customer-configurable quantity;
- quantity default/min/max/step;
- Featured bool.

Key invariant:
> If the customer-policy controller is removed, the composable occupant is still a valid normal Tier occupant.

The policy drawer must never create/prioritize/price inclusions independently. It references the published occupant's existing inclusion `item_id`s only. No second inclusion list or duplicated commercial authority.

## Claude implementation scope
1. Preserve the existing normal composable occupant Configure/Edit flow unchanged.
2. On the composable home shell, expose a customer-policy View/Edit action only when there is a real composable occupant to manage; define sensible disabled/empty-state behavior before first publish.
3. Open a dedicated policy drawer/module from that shell action, not a second product configurator.
4. Load policy rows from the occupant's existing inclusions and existing `customer_policy` persistence contract.
5. Save through established composable occupant persistence with server-side identity/value validation; reopen must faithfully reproduce saved policy.
6. Customer Price Option remains non-selectable. Commercial Legs/commitment/Editions are read-only/out of scope in this drawer.
7. Add focused contracts for shell action visibility, policy/inclusion identity binding, save/reopen, validation, and no regression to normal Tier/Add-on occupant flows.

## Hard non-change boundary
No sixth Tier, second Tier Instance/Family assignment, separate product identity, parallel inclusion catalogue, client pricing math, fake production records, REST/DevTools bypass, cart/quote/Request/PDF/email/promotions work, or TCV arithmetic.

## Claude next action
Audit the current composable home shell, shared drawer/lifecycle, and existing `customer_policy` persistence path first. Implement the smallest external policy-controller drawer on a review branch. Record design, changed files, tests/contracts, exact branch SHA and unresolved risks here; set **AWAITING CHATGPT REVIEW** and stop. Do not push `main`.

## Claude Report — round 1 (`a29a93b8`)

### Source audit findings (before writing anything)
- The composable occupant's individual-Tier screen (`TierDrawerContent.tsx`/`useTierDrawerController.ts`) is the SAME shared, heavily-used composition every one of the five normal Tier slots opens — not a separate composable-only screen. This is high-blast-radius shared machinery; every change here had to be additive and conditionally gated, never a fork.
- The Details group already composes its four existing modules (Overview, Pricing Rules, Features, FAQs) as `PlacedShell` instances over `ShellSchema` definitions registered in `TIER_ENTITY.shells` (`entities/tier.ts`) — a fifth, `customer_policy`, is the natural, already-precedented slot (`customer_policy` has been a `PackageSchema::TIER_MODULES` member since Phase 2A).
- Existing precedent for "only show this once a real occupant exists" (not "once published"): Options' own Edition switcher and the "+ Edition" nav button both gate on `detail.occupant_id` being truthy — the same gate I used for the new module.
- Two real, pre-existing backend plumbing gaps, invisible until an actual admin form tried to read/revert `customer_policy`:
  1. `PackageSchema::normaliseTierSlot()` (the function the admin GET response is built from) never included `customer_policy` in its returned array at all, even though `settleTierSlot()` already persisted it correctly — the value was stored but silently invisible to any admin read.
  2. The composable module revert REST route was registered with a literal `overview|pricing_rules|features|faqs` regex; `customer_policy` (already fully handled, generically, by `revertTierModuleDraft()` at the PHP-function level) could never reach that handler — a 404 invisible without booting a real WP REST server.

### Design decisions flagged for the auditor (not silently decided)
1. **No separate top-level "Customer Options" action.** The work file's point 2 asked to "expose a customer-policy View/Edit action" on the shell. I read "that shell action" (point 3) as the composable occupant's EXISTING View/Edit action — the new module is a fifth card inside the SAME screen that action already opens, gated on `detail.occupant_id`, rather than a new, separate top-level button/menu entry on the card itself. Reasoning: both existing card surfaces (the Service-scoped `ReadBlock` and the Family-first workspace's split-action card) converge on the identical screen; adding a second launcher there felt like more surface area than "the smallest" asked for, and the gating requirement ("only when there is a real composable occupant to manage") is satisfied identically either way. Flagging this explicitly — if a dedicated shortcut action is actually wanted, it's a small, additive follow-up.
2. **Price Option authoring removed from the editor.** I initially built full Price Option policy authoring (fixed/choice, allowed ids, default) into the editor, since it's part of the existing `customer_policy` schema. On review, I noticed the work file's own "owns only" list is precise and does NOT include Price Option — so I stripped it back out to match that list exactly rather than silently exceed the given scope. Every item's `price_option` now stays permanently `{mode:'fixed'}` from this drawer. This leaves the backend's already-built `'choice'` mode support (Phase 2A) with no Admin authoring path anywhere in the product — flagging this as a real, deliberate gap in case the omission from the "owns only" list was not meant to be permanent.

### Files changed (branch `review/composable-tier-admin-customer-policy` @ `a29a93b8`, base `main@28613c05`)
Backend: `PackageSchema.php` (`normaliseTierSlot()` gains `customer_policy`; `emptyTierDetail()` shape parity), `PackageStationController.php` (revert route regex widened to include `customer_policy`).
Frontend: new `CustomerPolicyEditor.tsx` (repeatable-collection editor, modeled on `PoolInclusionsEditor.tsx` — the sanctioned pattern for this shape per `fields/types.ts`'s own documented boundary, not `AdminField` definitions); new `tierCustomerPolicyShell` in `bindings/tier.tsx`, registered in `entities/tier.ts`; threaded through `types.ts` (`SurfaceTierDetail.customer_policy`, `TierDrafts.customer_policy` — wrapped `{value: CustomerPolicy|null}|null`, unlike every sibling draft, since a sanitized policy can itself legitimately be null and `drafts.customer_policy === null` already means "no draft"), `moduleNotifications/tier.ts` (`tierCustomerPolicyModule`), `usePackageStation.ts` (`saveTierCustomerPolicy`, `draftPreferredDetail()`'s wrapped-draft unwrap), `useTierModuleEditing.ts`/`useTierDrawerController.ts`/`tierDetailModel.ts`/`tierDrawerTypes.ts` (fifth module wired through the section-editing state machine), `TierDrawerContent.tsx` (conditional fifth `PlacedShell`, gated `isComposableOccupant(editingTierId) && detail.occupant_id`).
Docs: new Code Map `tier-composable-occupant-admin-customer-policy.md`, cross-linked from the three related composable-occupant docs and `000-README.md`; both module `CLAUDE.md` validation lists updated.
Tests: new `tests/composable-customer-policy-admin-surface.php` (both backend fixes) and `scripts/tier-customer-policy-draft-contract.ts` (the wrapped-draft unwrap: no-draft / explicit-clear / pending-policy — each a genuinely distinct case, proven distinct).

### A pre-existing locked-contract count updated, not gamed
`scripts/tier-system-drawer-contract.ts` hardcoded `(...).length === 4` asserting "all four Tier modules... share DETAILS_FOOTER/DETAILS_ACTIONS." My fifth module genuinely uses that exact same shared convention, so I updated the count to 5 with an explicit comment explaining why this isn't loosening the check — the actual invariant (no per-module footer/actions superset) is still enforced by the same negative checks, byte-identical. Flagging this prominently since "never rewrite a locked contract to pass" is something I take seriously; happy to have this specific change independently scrutinized.

### Validation run
Full existing PHP suite (SurfacePackages module) + new admin-surface test — all pass. `npx tsc --noEmit` clean. `npm run build` succeeds. `npm run docs:check` passes. Every relevant TS contract (`drawer-module-entry` — now 15 shells; `tier-system-drawer`; `tier-instance-scope`/`tier-instance-tool`; `tier-occupant-admin`; `tier-edition-admin`/`tier-edition-switch`/`tier-edition-move-to-bin`; `tier-overview-is-addon`; `tier-lifecycle-menu`; `supported-action-footer`; `composable-occupant-address`/`composable-occupant-workspace`; the new `tier-customer-policy-draft`) passes. `npm run regression:rate-sheet-row-lock`/`rate-sheet-service-import`/`rate-sheet-bundle`/`entity-action-footer-menu-only` all pass.

Two categories of pre-existing, unrelated failures confirmed via `git stash` against the unmodified branch base (`28613c05`) before touching anything, left untouched: (1) `tier-capability-invariants.php` and the `admin-station-css` contract's six `cz-rate-sheet-tool__*` findings — both already failing identically on the clean base; (2) `npm run regression:tier-occupant-lifecycle`/`tier-edition-lifecycle`/`tier-publish-timeout` all crash identically on the clean base too, on an unrelated `d.audienceGroups.length` TypeError inside `tierOverviewShell`'s own content bind — a stale fixture/bundling issue in those three specific regression scripts, not something this round touched or caused.

### Remaining gaps
No live browser validation (no local WordPress environment) — same posture as every prior round in this whole feature. Price Option authoring (see design decision 2 above). No dedicated top-level launcher action (see design decision 1 above) — reachable today only through the composable occupant's existing View/Edit entry points. No cart/quote/Request/PDF/email/promotions work — untouched, as required.