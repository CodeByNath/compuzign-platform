// Contract: composable Default/Edition cue selection is a genuine
// interaction (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md, "Block composable Edition candidate on unsynced cue
// selection").
//
// Prior round's defect: the mount/reseed effect in ComposableOfferBrowser.tsx
// unconditionally set hasInteracted(false) whenever activeEditionId changed
// — including a genuine customer cue click, not merely the component's own
// first mount or FamilyTierAdapter's Manage-build rehydration seed. Since
// the auto-commit effect only ever calls onCommit/onRemoveFromQuote when
// `hasInteracted` is true, clicking the cue changed which container the
// browser previewed but never updated the committed cart line unless the
// customer ALSO performed a separate Add/Remove/quantity click — impossible
// for a required-only Edition (no optional row to click at all).
//
// This is a component-effect timing property (state transitions across
// renders via a ref), not a pure function — same precedent as
// composable-quote-cart-contract.ts's own "8b" reconciliation-effect
// section, which documents the identical source-scan rationale. The pure
// half of the underlying fix (buildComposableFamilyTierQuoteItem resolving
// tierEditionPlatformId/title from the active Edition) is already exercised
// directly in composable-quote-cart-contract.ts.
//
// Properties locked:
//   1. editionCueRef starts { mounted: false, lastEditionId: activeEditionId }
//      — its OWN first read, not a hardcoded null, so a browser that mounts
//      directly onto a rehydrated (non-Default) Edition still correctly
//      treats its own first run as "no interaction yet".
//   2. The reseed effect derives hasInteracted from
//      `mounted && activeEditionId !== lastEditionId` — never unconditionally
//      false (the prior round's defect) and never unconditionally derived
//      from `selection`/rows content (which a required-only Edition has
//      nothing to toggle).
//   3. The ref is updated to { mounted: true, lastEditionId: activeEditionId }
//      on EVERY run of that same effect — so a second, later cue click
//      compares against the MOST RECENT activeEditionId, not the original
//      mount value; a mount rehydrating directly onto a real Edition still
//      reports mounted:false on its own first run (property 1), so the
//      immediately-following state does not spuriously look interacted.
//   4. Symmetry: no special-casing distinguishes a null (Default)
//      activeEditionId from a real Edition id anywhere in this logic — a
//      Default -> Edition and an Edition -> Default cue click are the exact
//      same code path.
//   5. This fix touches no primary-Tier reference at all: the file gained
//      no new mention of selectedTierId/family.pricing.tiers — the primary
//      quote remains completely outside this component's own state.
//   6. The debounce/cleanup architecture around the preview request is
//      unchanged (same PREVIEW_DEBOUNCE_MS timer, same cancelled-guard
//      cleanup) — a cue-triggered resolve is not raced by a NEW mechanism
//      this fix might have introduced.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable Edition cue sync contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const browserSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/ComposableOfferBrowser.tsx'), 'utf8');

// ── 1 & 3. editionCueRef exists with the correct initial/update shape ──────

check(
  /const editionCueRef = useRef<\{ mounted: boolean; lastEditionId: string \| null \}>\(\{ mounted: false, lastEditionId: activeEditionId \}\);/.test(browserSource),
  'editionCueRef is seeded from activeEditionId itself (not a hardcoded null) with mounted: false — a browser that mounts directly onto a rehydrated Edition still correctly treats its own first run as unseen/no-interaction-yet',
);

const reseedEffectMatch = browserSource.match(/useEffect\(\(\) => \{\s*\n\s*\/\/ project-work\/2026-09-06-tier-catalogue-admin-ux-consolidation\.md\s*\n\s*\/\/ \("Reject primary-bound Upgrade cue\.\.\."\)([\s\S]*?)\}, \[family\.family_id, rowIdsKey, activeEditionId\]\);/);
check(reseedEffectMatch !== null, 'the reseed effect (keyed on family.family_id/rowIdsKey/activeEditionId) exists');
const reseedEffectBody = reseedEffectMatch![1];

check(
  /const \{ mounted, lastEditionId \} = editionCueRef\.current;\s*\n\s*setHasInteracted\(mounted && activeEditionId !== lastEditionId\);/.test(reseedEffectBody),
  'hasInteracted is derived from mounted && activeEditionId !== lastEditionId — never unconditionally false (the prior round\'s defect, which silently swallowed every cue click) and never dependent on selection/rows content, which a required-only Edition has nothing to toggle in at all',
);
check(
  /editionCueRef\.current = \{ mounted: true, lastEditionId: activeEditionId \};/.test(reseedEffectBody),
  'the ref is updated to the CURRENT activeEditionId on every run — so the NEXT cue click compares against the most recently processed value, never the original mount value',
);

// The ref update must come AFTER the setHasInteracted read that consumes
// the PREVIOUS ref state — reading and writing in the wrong order would
// make every run see its own just-written value and never detect a change.
const hasInteractedReadIndex = reseedEffectBody.indexOf('setHasInteracted(mounted && activeEditionId !== lastEditionId);');
const refWriteIndex = reseedEffectBody.indexOf('editionCueRef.current = { mounted: true, lastEditionId: activeEditionId };');
check(
  hasInteractedReadIndex > -1 && refWriteIndex > hasInteractedReadIndex,
  'the ref is read (via the mounted/lastEditionId destructure feeding setHasInteracted) strictly BEFORE it is overwritten in the same effect run — otherwise every run would compare activeEditionId against itself and never detect a genuine change',
);

// ── 2. Rehydration (first run) never reports an interaction ────────────────

check(
  !/setHasInteracted\(false\)/.test(reseedEffectBody) && !/setHasInteracted\(true\)/.test(reseedEffectBody),
  'the reseed effect never hardcodes setHasInteracted to either literal — the ONLY value it ever sets is the derived `mounted && activeEditionId !== lastEditionId` expression, so a mount/rehydration (mounted: false on its own first run) always evaluates to false there, and a genuine cue click always evaluates to true, never a hardcoded literal overriding either case',
);

// ── 4. No special-casing between Default (null) and a real Edition id ──────

check(
  !/activeEditionId === null[\s\S]{0,80}setHasInteracted|activeEditionId !== null[\s\S]{0,80}setHasInteracted/.test(reseedEffectBody),
  'no null-vs-real-id special case gates hasInteracted — Default -> Edition and Edition -> Default are the exact same `activeEditionId !== lastEditionId` comparison',
);

// ── 5. Primary Tier/Edition identity untouched — locked at the backend
//    (tests/composable-edition-selection.php, "the primary Tier occupant
//    is never touched") and at the wiring layer (composable-focused-shell-
//    unification-contract.ts's own selectedPrimaryItem passthrough checks).
//    This fix touches neither: the reseed effect above reads/writes only
//    activeEditionId/rows/selection/hasInteracted, never selectedTierId or
//    a primary-scoped quote field.

// ── 6. Debounce/cleanup architecture around the preview request is unchanged ─

check(
  /const timer = window\.setTimeout\(\(\) => \{/.test(browserSource) && /PREVIEW_DEBOUNCE_MS\);/.test(browserSource),
  'the preview request is still debounced by the same PREVIEW_DEBOUNCE_MS timer — this fix adds no second timing mechanism',
);
check(
  /return \(\) => \{ cancelled = true; window\.clearTimeout\(timer\); \};/.test(browserSource),
  'the debounce cleanup (cancelled guard + timer clear) is unchanged — a cue click immediately followed by another change (or unmount) still tears down the superseded request exactly as before',
);

console.log('Composable Edition cue sync contract: PASS');
