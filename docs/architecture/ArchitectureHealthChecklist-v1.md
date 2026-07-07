# Architecture Health Checklist — v1

Reviewer checklist for any PR that adds an entity, module, or admin surface.
Short and strict: every "yes" below either needs an Amendment Log entry in
[SchemaWorkstationArchitecture-v1.md](SchemaWorkstationArchitecture-v1.md) §14
or is a **blocking finding**. When in doubt, the rationale lives in
[CompuZignArchitectureADR-v1.md](CompuZignArchitectureADR-v1.md); the build
steps live in
[PlatformEntityOnboardingGuide-v1.md](PlatformEntityOnboardingGuide-v1.md).

Expected answer to every question: **No.**

---

## 1. Inventory growth

- [ ] **Did we add a shell archetype?** Overview and Child are the
      inventory. A third must first *fail* to be expressed as content,
      actions, or mode configuration on an existing archetype — then it's
      an amendment, not a PR.
- [ ] **Did we add a `ShellMode`?** Six exist (`details · connections ·
      edit · summary · table · card`). A "mode" that would alias an
      existing one or needs cardinality awareness is a placement or DNA
      concern, not a mode.
- [ ] **Did we add a renderer component under `schema/`?** New entities add
      manifests, bindings, and tables — never renderers. New element × mode
      renderers require an amendment plus per-mode render cases in
      `scripts/mode-renderer-snapshot.mjs`.
- [ ] **Did we add a Platform Element or use `custom`?** Elements need one
      real consumer + amendment entry + mode renderers. Every `custom` use
      must be logged as a candidate element (promotion needs 2+ consumers).

## 2. Boundary integrity

- [ ] **Did business logic leak into a shell, binding, or step?** Shells
      never compute status, derive notes, or call endpoints. Grep: nothing
      under `ts/components/admin/schema/` imports a fetcher; `bind`/`when`
      closures are data access only, never mode logic.
- [ ] **Did we duplicate Station DNA?** One `ModuleDefinition` per module,
      in `moduleNotifications.ts`. No copied `resolveStatus` closures, no
      status derivation in components, no lifecycle constants outside
      `StationLifecycle` imports, no status writes outside the engine's
      transition table.
- [ ] **Did we bypass EntitySchema / WorkstationSchema?** Drawers assemble
      from `placements.drawer` via `EntityDrawer`; tables come from
      `TableSchema` via `EntityTable`; workstations are registry entries.
      Hand-written `.drawerModule` JSX, bespoke `<table>` literals, and
      Router/Sidebar edits are all blocking. Backend module keys must
      mirror manifest keys exactly.
- [ ] **Did WordPress-owned data get duplicated into station meta?** WP
      owns names, slugs, and relationships; meta envelopes go through the
      entity's single Support class.

## 3. Placement discipline

- [ ] **Did repetition end up inside a shell or mode instead of Collection
      Placement?** Repeated cards = one shell, `summary`/`card` viewpoint,
      `placements.collections` slot, surface-owned N bindings. A shell must
      never know it has siblings.
- [ ] **Did a placement invent footer actions?** `ShellSlot.footer`
      re-selects from the shell's declared Action Group — select-only.
- [ ] **Did a connection embed a foreign drawer?** Cross-station navigation
      is transit: `view` → the target's real drawer with its full
      `initialStepData`. No reduced drawer forks.

## 4. Presentation Status Contract

- [ ] **Is any pill derived outside `presentation.ts`?** No local pill
      maps, ever. Pills render Active / Pending / Disabled only;
      Archived/Trashed labels only on travel surfaces; **no Draft pill**.
- [ ] **Does any surface render raw lifecycle status?** Operational states
      (`draft/active/disabled/archived/trashed`) are storage vocabulary,
      never UI copy.

## 5. Proof

- [ ] **Are snapshots missing or drifted?** `mode-renderer-snapshot.mjs`
      compares clean (zero new entries unless amended);
      `module-state-snapshot.mjs` has fixture rows for every new
      `ModuleDefinition` and all existing rows byte-identical.
- [ ] **Is a locked file diffed without an amendment?** The locked set:
      `EntityDrawer`, `EntityTable`, `DrawerTabs`, `ActionFooter`,
      `ReadBlock`, `AsyncSection`, `useInlineConfirm`, `ModuleStatusPill`,
      `ModuleNotificationPanel`, `InlineEditorShell`, `presentation.ts`,
      `modeContext`, `overviewShell`, `childShell`, `evaluateModule`,
      `StationLifecycle.php`, `schema/types.ts`.
- [ ] **Was a blocker worked around instead of documented?** Anything the
      contracts couldn't express must appear as a Gap Protocol entry (what
      was attempted, which contract blocked it, smallest proposed
      amendment) — not as absorbed one-off JSX.

---

**Verdict rule.** All boxes "No" → approve. Any "Yes" without a matching
Amendment Log or gap-report entry → request changes, citing this checklist
and the ADR entry it protects.

## Amendment Log

| Date | Amendment | Notes |
|---|---|---|
| 2026-07-07 | v1 — checklist written | Operationalises the S6 budget audit (blueprint §1, Phase G.3) as a standing PR gate, at architecture handoff. |
