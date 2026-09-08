// Contract: Upgrade Your Build browsing shell visual parity + top floating
// tab reuse (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
// "focused-shell visual parity and top tab refinement").
//
// Properties locked:
//   1. Outer container geometry is reused, not reinvented: the desktop
//      column proportions inside .cz-package-builder__upgrade-browsing's
//      own min-width: 1024px media query are display:grid with the SAME
//      grid-template-columns/gap values as .cz-package-builder__focused —
//      copied verbatim, not independently chosen — while the breakpoint
//      itself stays this stage's own already-accepted 1024px (never
//      .focused's 767px collapse point). Mobile-first column stacking is
//      unchanged (locked separately in upgrade-your-build-gate-contract.ts).
//   2. The left "detail" box (.cz-package-builder__upgrade-browsing-detail)
//      copies .cz-package-builder__focused-detail's own border/padding/
//      radius/gap declarations verbatim — the same bordered-frame grammar,
//      not a second visual system — and ComposableOfferBrowser's own
//      content is untouched inside it (no props changed, no internal
//      markup touched).
//   3. The right card (.cz-package-builder__upgrade-summary) reuses
//      .cz-cost-builder__tier's own background/border-color/radius (the
//      real focused card's visual authority — .cz-package-builder__
//      focused-card itself carries no border, it's a plain sticky
//      wrapper), and is sticky at the same 1024px breakpoint the way
//      .cz-package-builder__focused-card is sticky (each stage's own
//      breakpoint; never cross-borrowed).
//   4. Top floating tab reuse: FamilyTierAdapter renders the SAME
//      EditionCueSelector component inside the browsing stage, wired to
//      the SAME selectVariant() function the normal focused shell's own
//      tab/Edition chips already call — never a second/parallel
//      switching path, never a lookalike component.
//   5. No new variant-selection state: the tab's active identity
//      (primaryActiveEditionId) is derived fresh every render from the
//      already-quoted primary's own tierEditionPlatformId (via Platform-ID
//      equality against the Family's edition_options — never inferred
//      from a label or array index), NOT from focusedEditionId or any
//      other new state variable. This is also what makes the tab
//      automatically show the right context regardless of which of the
//      three entry points (initial Browse Catalogue, Cart footer, or
//      line-level Manage build) opened browsing, with zero extra wiring
//      per entry point.
//   6. Occupant/default presentation follows the SAME tab grammar as
//      Edition: EditionCueSelector is rendered unconditionally (its own
//      existing single-destination fallback handles the "no Editions"
//      case), never a bespoke "hide the tab" special case here.
//   7. Existing Upgrade content/behavior is unchanged: ComposableOfferBrowser
//      and UpgradeBuildSummary still receive the exact same props as
//      before this correction (locked in upgrade-your-build-gate-contract.ts
//      / manage-build-contract.ts); this file only re-verifies the new
//      wrapper/tab layer does not alter either component's own props.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Upgrade shell visual parity contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// ── 1. Outer geometry copied verbatim from .cz-package-builder__focused ────

const focusedGridMatch = cssSource.match(/\.cz-package-builder__focused \{([^}]*)\}/);
check(focusedGridMatch !== null, '.cz-package-builder__focused rule exists');
const focusedGridBody = focusedGridMatch![1];
const browsingGridMatch = cssSource.match(/@media \(min-width: 1024px\) \{\s*\.cz-package-builder__upgrade-browsing \{([^}]*)\}/);
check(browsingGridMatch !== null, 'the desktop browsing-stage grid rule exists');
const browsingGridBody = browsingGridMatch![1];
check(
  /grid-template-columns:\s*minmax\(0, 3fr\) minmax\(280px, 2fr\);/.test(focusedGridBody)
    && /grid-template-columns:\s*minmax\(0, 3fr\) minmax\(280px, 2fr\);/.test(browsingGridBody),
  'the browsing-stage desktop grid uses the EXACT SAME grid-template-columns value as .cz-package-builder__focused',
);
check(
  /gap:\s*var\(--cz-space-5\);/.test(focusedGridBody) && /gap:\s*var\(--cz-space-5\);/.test(browsingGridBody),
  'the browsing-stage desktop grid uses the same gap token as .cz-package-builder__focused',
);
check(
  /align-items:\s*start;/.test(browsingGridBody),
  'the browsing-stage desktop grid sets align-items: start, matching .cz-package-builder__focused',
);

// ── 2. Left detail box copies .cz-package-builder__focused-detail verbatim ─

const focusedDetailMatch = cssSource.match(/\.cz-package-builder__focused-detail \{([^}]*)\}/);
check(focusedDetailMatch !== null, '.cz-package-builder__focused-detail rule exists');
const focusedDetailBody = focusedDetailMatch![1];
const browsingDetailMatch = cssSource.match(/\.cz-package-builder__upgrade-browsing-detail \{([^}]*)\}/);
check(browsingDetailMatch !== null, '.cz-package-builder__upgrade-browsing-detail rule exists');
const browsingDetailBody = browsingDetailMatch![1];
for (const prop of ['min-width: 0;', 'border: 1px solid var(--cz-color-line-strong);', 'padding: var(--cz-space-12);', 'border-radius: var(--cz-radius-sm);']) {
  check(
    focusedDetailBody.includes(prop) && browsingDetailBody.includes(prop),
    `.cz-package-builder__upgrade-browsing-detail declares the same "${prop}" as .cz-package-builder__focused-detail`,
  );
}
check(
  /ComposableOfferBrowser\s+family=\{family\}\s+context="upgrade_your_build"\s+initialCartItem=\{selectedComposableItem\}\s+primaryItem=\{selectedPrimaryItem\}\s+onCommit=\{onComposableCommit\}\s+onRemoveFromQuote=\{onComposableRemove\}/.test(adapterSource),
  'ComposableOfferBrowser still receives the exact same props as before this correction — no prop added/removed/wrapped',
);

// ── 3. Right card reuses .cz-cost-builder__tier's own visual authority ─────

const tierCardMatch = cssSource.match(/\.cz-cost-builder__tier \{([^}]*)\}/);
check(tierCardMatch !== null, '.cz-cost-builder__tier rule exists');
const tierCardBody = tierCardMatch![1];
const upgradeSummaryMatch = cssSource.match(/\.cz-package-builder__upgrade-summary \{([^}]*)\}/);
check(upgradeSummaryMatch !== null, '.cz-package-builder__upgrade-summary rule exists');
const upgradeSummaryBody = upgradeSummaryMatch![1];
check(
  /background:\s*var\(--cz-color-surface-2\);/.test(tierCardBody) && /background:\s*var\(--cz-color-surface-2\);/.test(upgradeSummaryBody),
  '.cz-package-builder__upgrade-summary uses the same background token as .cz-cost-builder__tier',
);
check(
  /border:\s*1px solid var\(--cz-color-line\);/.test(tierCardBody) && /border:\s*1px solid var\(--cz-color-line\);/.test(upgradeSummaryBody),
  '.cz-package-builder__upgrade-summary uses the same border color token as .cz-cost-builder__tier (not --cz-color-border)',
);
check(
  /border-radius:\s*var\(--cz-radius-sm\);/.test(tierCardBody) && /border-radius:\s*var\(--cz-radius-sm\);/.test(upgradeSummaryBody),
  '.cz-package-builder__upgrade-summary uses the same radius token as .cz-cost-builder__tier',
);
const stickySummaryMatch = cssSource.match(/@media \(min-width: 1024px\) \{\s*\.cz-package-builder__upgrade-summary \{([^}]*)\}/);
check(stickySummaryMatch !== null, 'a min-width: 1024px rule makes .cz-package-builder__upgrade-summary sticky');
check(
  /position:\s*sticky;/.test(stickySummaryMatch![1]) && /top:\s*var\(--cz-space-4\);/.test(stickySummaryMatch![1]),
  'the sticky rule matches .cz-package-builder__focused-card\'s own position/top values',
);
check(
  /<UpgradeBuildSummary\s+primaryItem=\{selectedPrimaryItem\}\s+composableItem=\{selectedComposableItem\}\s+onExit=\{dismissUpgradeGate\}\s*\/>/.test(adapterSource),
  'UpgradeBuildSummary still receives the exact same props as before this correction',
);

// ── 4 & 5 & 6. Top tab reuse: same component/function, no new state ────────

const browsingBranchMatch = adapterSource.match(/\{upgradeGateActive === 'browsing' && selectedTierId !== null && \(\(\) => \{([\s\S]*?)\}\)\(\)\}/);
check(browsingBranchMatch !== null, 'the browsing-stage IIFE exists');
const browsingBranchBody = browsingBranchMatch![1];
check(
  /const primaryTierData = family\.pricing\.tiers\[selectedTierId\];/.test(browsingBranchBody),
  'the tab identity is resolved from family.pricing.tiers[selectedTierId] — the live prop, never a stored copy',
);
check(
  /const primaryActiveEditionId = selectedPrimaryItem\?\.tierEditionPlatformId\s*\n\s*\? primaryEditionOptions\.find\(\(option\) => option\.edition_platform_id === selectedPrimaryItem\.tierEditionPlatformId\)\?\.id \?\? null\s*\n\s*: null;/.test(browsingBranchBody),
  'the active Edition identity is resolved by Platform-ID equality against the already-quoted primary item — never inferred from a label or array index, never a new state variable',
);
check(
  !/const \[.*primaryActiveEditionId|useState.*[Pp]rimaryEdition/.test(browsingBranchBody),
  'primaryActiveEditionId is a plain derived local, not a useState — no new variant-selection state is created',
);
check(
  /<EditionCueSelector\s+destinations=\{\[\{ id: null, label: 'Default' \}, \.\.\.primaryEditionOptions\.map\(\(edition\) => \(\{ id: edition\.id, label: edition\.label \}\)\)\]\}\s+activeId=\{primaryActiveEditionId\}\s+onSelect=\{\(editionId\) => selectVariant\(selectedTierId, editionId\)\}\s*\/>/.test(browsingBranchBody),
  'EditionCueSelector is rendered unconditionally (same "always render, let it handle the no-Editions case" grammar as the normal focused shell) and wired to selectVariant(selectedTierId, editionId) — the EXACT same switching function the focused shell\'s own tab/chips call, never a second/parallel path',
);

console.log('Upgrade shell visual parity contract: PASS');
