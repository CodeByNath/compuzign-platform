# Tier Module L5 (Data-Layer) Migration Spec — v1

**Status:** design spec. No code. Sequenced for later implementation.

## Purpose

The tier modules (Tier Overview, Tier Features, Tier FAQs) are **presentation-migrated but data-layer-legacy** — they adopt the canonical frame, view/edit, status, and notes (L1–L4) but still run on the retired surface-package tier engine for **L5: data ownership + save lifecycle**. This spec defines the L5 migration that brings the tier onto the same **station pattern** as `useServiceStation`, so the tier stops carrying two architectures.

## Governing principles (read first)

1. **Architectural migration, not a code port.** The tier does not get a copy of `useServiceStation`. It adopts the **station *pattern*** — single-source load, draft-preferred derive, per-module persist-through + patch, draft→settle — and shares that pattern's primitives. `useServiceStation` is the *reference implementation* of the pattern, not a template to duplicate.
2. **Mirror behaviour and lifecycle, not implementation.** `usePackageStation` must exhibit the same observable contract and lifecycle as `useServiceStation`. Where logic is generic (draft-merge, patch-in-place, settle, note evaluation, status resolution) it is **shared**, not re-authored. Only the store adapter and the module set differ.
3. **Package Station is the single source of truth for the package module *and* all tier modules.** One record (`cz_service_package_station`), one hook. The package overview (Package Summary + 4-tier summary) and every individual tier are slices of the *same* source.
4. **No `useTierStation`. Ever.** A tier is a slice of the package station, never its own station. Per-tier operations are `usePackageStation` methods that take a `tierId`. Nothing owns "a tier" as an independent record on the client.

**Non-negotiable domain constraints carried in:**
- **Anchor/consumer model stays.** The service owns the canonical inclusion/FAQ pools; a tier holds *references/overrides* (`inclusions_override` = `{id,label}`, `faq_refs` = `[id]`). L5 migration does **not** turn tier features/FAQs into free-edit lists.
- **The package station store keeps ownership.** This spec adds a draft/settle layer *inside* that store; it never moves package/tier data into a new store or a per-tier record.

---

## 1. The station pattern, and where the two stations share vs differ

Rather than describe `usePackageStation` as a mirror of `useServiceStation`, define the **station contract** both satisfy, then state what each supplies. This is what keeps it a migration and not a port.

**Station contract (shared behaviour):**
- Loads its authoritative record **once** into a single in-memory source.
- Exposes each module as a **draft-preferred** derived value (`draft ?? settled`).
- Resolves each module's **status** (5-state) and **notes** from shared engines.
- Every per-module mutation **persists a draft and patches the in-memory source in place** → instant re-render, no refetch.
- A **settle** operation commits drafts to the live record; **enable/disable** and **revert** are separate lifecycle actions.
- Calls `onRefresh` after every mutation.

**What each station supplies to the contract:**

| Pattern slot | Shared primitive | `useServiceStation` supplies | `usePackageStation` supplies |
|---|---|---|---|
| Store adapter | — | service detail (`cz_service_meta` drafts) | package station (`cz_service_package_station`) |
| Module set | — | overview, inclusions, faqs (service-owned) | **package module** (summary/popular/bundle) + per-tier overview/features/faqs |
| Draft-merge (`draft ?? settled`) | **shared** | applies to 3 modules | applies per tier × 3 + package module |
| Status resolution | **shared** (`moduleStatus.tsx`) | `resolveOverviewStatus` | `resolveTierStatus` / `resolvePackageStatus` (already exist) |
| Notes | **shared** (`evaluateModule`) | `getXNotes` | `tierOverviewModule`/`tierFeaturesModule`/`tierFaqsModule` (already exist) |
| Persist-through + patch | **shared discipline** (extract a small helper) | `saveX` | `saveTierX` (takes `tierId`) |
| Settle | **shared discipline** | `settleModules` | `settleTier(tierId)` |

**Anti-duplication measure:** extract the generic parts of the station pattern — draft-merge, patch-in-place, settle-commit — into shared primitives (a `useModuleStation` core, or plain helpers) parameterised by *store adapter* + *module set*. `useServiceStation` is refactored to consume them; `usePackageStation` consumes the same. Neither hand-rolls the mechanism twice. If extraction proves too invasive during implementation, the fallback is shared **helpers** (not a shared hook) — but never copy-pasted method bodies.

**`usePackageStation` owns the whole package station**, not just tiers: the package overview (Package Summary, `popular_tier`, `bundle`, 4-tier summary) and each tier are read from and written to the one hook. The service drawer's Package Summary *connection* card stays a read-only consumer of a summary; it does not own the store.

---

## 2. Tier module drafts

Retire the single `TierDraft` (which mixes all three sections **and** the `new_*` staging arrays). At step level, hold **per-module drafts**, the same shape discipline the service editors use:

| Draft | Fields | Notes |
|---|---|---|
| `tierOverviewDraft` | `label`, `price`, `contact`, `billing_cycle`, `popular`, `popular_label` | tier-owned scalars |
| `tierFeaturesDraft` | `inclusions_override: {id,label}[]` | **references** into the service pool |
| `tierFaqsDraft` | `faq_refs: string[]` | **references** into the service pool |

Each carries an `*Original` snapshot for dirty detection. Each opens and saves independently. **These are transient step state only** (per principle 3 + doc §7); the source of truth is the hook. **`new_inclusions`/`new_faqs` are eliminated** (see §3).

---

## 3. `saveTierOverview` / `saveTierFeatures` / `saveTierFaqs`

Each is a **persist-through + patch** method on `usePackageStation`, obeying the shared station discipline (doc §6 step 4):

1. POST the module draft to a per-module tier endpoint (persists a **draft**, sets that tier-module's `module_status → pending`).
2. **Patch the package station source in place** (`tiers[tierId].drafts.<module> = result`) → the derived value recomputes and the view re-renders **immediately** — no refetch, no reopen, no response re-seed.
3. `onRefresh?.()`.

**`saveTierFeatures` / `saveTierFaqs` — the move that dissolves `new_*`:** adopt the **immediate-creation pattern already proven for categories** (doc §12: category creation is not deferred; `category_id` is a real persisted ID *before* module save):

- A newly typed feature/FAQ is created in the **service pool on commit** (Enter/blur), minting a real pool ID *before* the tier module saves.
- The tier draft then references that real ID like any pool item; `saveTierFeatures`/`saveTierFaqs` persist **references only** — no create-on-publish, no server-minted-at-publish IDs, no staging array.
- Dedupe stays server-side by slug (idempotent re-add).

The created item has a real ID at Save time, lands in the same ref list the view reads, and appears instantly — Service Features/FAQs behaviour, achieved **without** breaking the anchor/consumer model.

---

## 4. Settle / publish lifecycle

Bring the tier onto the two-phase lifecycle (doc §5, §11): **Save = draft; Settle = commit** — via a draft/status layer *inside* the existing package station tier slot (store keeps ownership, principle 3):

| Station-contract slot | Package station tier slot |
|---|---|
| per-module draft store | `tiers[tierId].drafts.{overview,features,faqs}` |
| per-module status | `tiers[tierId].module_status.{overview,features,faqs}` = `not-configured\|pending\|settled` |
| settle | `settleTier(tierId)`: commit `drafts → current_occupant`, clear drafts, `module_status → settled` |
| live/disabled | tier `enabled` / occupant `platform_status` (unchanged) |

- **Read merge:** `fetchServicePackageStation` returns each tier **draft-preferred** (`drafts.<module> ?? current_occupant.<module>`) + `module_status`, so pending edits show while the settled occupant is untouched — the same `draft ?? settled` order the service uses.
- **Live-tier safety (new):** editing an enabled tier stages into `drafts`; `current_occupant` is not mutated until `settleTier`. A published tier's live price cannot change mid-edit. The current atomic write has no such safety.
- **Footer mapping:** tier **Publish → Settle** (commit drafts). **Enable/Disable** stays separate (`toggleTierEnabled`). Package-overview pills read the same `module_status`.

---

## 5. How the Package Station stays the single source of truth

- Ownership is unchanged: `cz_service_package_station` remains the one authoritative record for the package module **and** all tier modules. This spec adds `drafts` + `module_status` *inside* each tier slot — nothing leaves the store, and no per-tier record is created.
- `usePackageStation` is the one client-side owner of that record: it loads it once, holds it as the **only** in-memory source, and every `saveTierX`/`savePackage*`/`settleTier` patches it in place. Package overview, 4-tier summary, and individual tiers all read hook-derived values from that single source.
- Service pools (`META_INCLUSIONS`/`META_FAQS`) remain the anchor; the station references them. Immediate pool creation writes the anchor first, references second — ownership direction preserved.

---

## 6. What the old tier engine gets retired

| Retired | Replaced by |
|---|---|
| Step-level `useApi(fetchServicePackageStation)` as data source | `usePackageStation` (single source, patch-in-place) |
| Single `TierDraft` (all 3 sections + `new_*`) | three per-module drafts (§2) |
| `new_inclusions` / `new_faqs` staging arrays | immediate pool creation → real refs (§3) |
| Server-minted-at-publish IDs (pool-add inside the atomic tier save) | immediate pool-create on commit |
| `saveSection` (no-op close) | real `saveTierOverview`/`saveTierFeatures`/`saveTierFaqs` |
| Atomic whole-tier `saveServicePackageStationTier` as the **only** write | per-module saves + `settleTier`; atomic endpoint retired or narrowed to enable/disable |
| `tierDraftFromDetail` single-draft seeding | per-module draft init |
| `handleSave` response **re-seed** workaround | unnecessary — `saveTierX` patches the source directly |
| `current_occupant`-only tier slot | occupant **+ drafts + module_status** slot |

`current_occupant`/`history` is **kept** (settled-record store) and gains the `drafts`/`module_status` sibling. The `useServiceStation` internals are **refactored to share** the extracted station primitives, not left as a separate copy for the package hook to imitate.

---

## 7. Migration phases & risk

Sequenced store → shared primitives → data layer → step → lifecycle → retire → docs, each phase shippable and reversible.

| Phase | Scope | Risk | Mitigation |
|---|---|---|---|
| **P0 — Spec** | This doc; lock tier-slot schema shape | none | — |
| **P1 — Extract station primitives** | Pull draft-merge / patch-in-place / settle out of `useServiceStation` into shared primitives; refactor `useServiceStation` onto them with **no behaviour change** | Regressing the working Service modules | Land as pure refactor behind existing tests + manual service-drawer check before any tier work |
| **P2 — Store schema** | Add `drafts` + `module_status` to each tier slot; backfill (`drafts=null`, `module_status=settled`) | Data migration hides live tiers | Idempotent backfill; default settled; read path defaults missing keys |
| **P3 — Backend endpoints** | Per-module tier save (draft) + `settleTier`; draft-preferred read merge; keep atomic endpoint alive in parallel | Old/new write-path divergence | Gate new endpoints; old path untouched until P6 |
| **P4 — `usePackageStation`** | Build the hook over the shared primitives + package store adapter; move `evaluateModule`/`resolveTierStatus` consumption into it. **No UI change.** | Double-source during cutover | Land hook unused; snapshot-compare derived values vs current `data.station` before wiring |
| **P5 — Per-module drafts + saves** | Split `TierDraft`; wire `saveTierX`; delete `saveSection` | Regression in the shared 2000-line `ServiceViewStep` | **Extract `ServiceTierStep` to its own file first** to shrink blast radius |
| **P6 — Immediate pool creation** | New feature/FAQ creates pool item on commit; delete `new_*` | Orphan pool items if a draft is cancelled post-create | Accept as intentional (category precedent §12); slug-dedupe prevents duplicates |
| **P7 — Settle + retire** | Footer Publish→Settle; retire atomic-save create path, `TierDraft`, `tierDraftFromDetail`, re-seed hack | Tier edits now draft-until-settle — user-visible shift | Ship with a "changes settle on Publish" cue; enable/disable stays immediate |
| **P8 — Docs** | Promote tier to canonical in ServiceDrawerModuleArchitecture-v1 + DrawerModuleSystem-v1; note the shared station primitives | doc drift | Update in place (no-duplication rule) |

### Cross-cutting risks
- **Anchor integrity:** immediate pool creation must write the service pool *before* referencing it; a failed create aborts the ref add (no dangling ref). Reuse the category commit's re-entrancy guard.
- **Blast radius:** `ServiceTierStep`, `ServicePromotionStep`, `ServiceViewStep` share one 2000-line file — extract the tier step (P5) before splitting drafts, or a tier regression takes down the service drawer.
- **Refactor-first ordering:** P1 (extract primitives) precedes all tier work so the Package hook consumes shared code from day one — this is the concrete guard against a code port.
- **Two-phase behaviour shift:** today a tier edit is effectively immediate-on-publish; after P7 it is draft-until-settle. Intended parity, but user-visible — call it out.
- **Promotions untouched:** Tier-only. `ServicePromotionStep` remains out of scope (separate legacy L5) and must not be pulled in.

---

## 8. Definition of done (L5 parity)

For all tier modules **and** the package module:

1. Data + status + notes are owned by **`usePackageStation`** (the one source for package + all tiers); the step holds only transient per-module drafts. No `useTierStation` exists.
2. `usePackageStation` and `useServiceStation` **share** the station primitives — no duplicated mechanism.
3. Per-module Save persists a draft and patches the source in place → immediate re-render, no refetch/reopen/re-seed.
4. A newly created feature/FAQ has a real pool ID at Save time and appears instantly (no `new_*`).
5. Editing an enabled tier stages to drafts; `settleTier` commits; the live occupant is untouched until settle.
6. `TierDraft`, `new_*`, `saveSection`, `tierDraftFromDetail`, and the atomic create-and-attach path are deleted.
7. Docs promote Tier to canonical and record the shared station primitives.

At that point the tier carries one architecture; §16 checklist item 8 (State ownership) — the boundary where migration currently stops — is satisfied by the *same* mechanism the Service modules use, not a second copy of it.
