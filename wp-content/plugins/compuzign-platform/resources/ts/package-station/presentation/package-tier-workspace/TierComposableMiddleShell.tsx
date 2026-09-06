// Composable-only middle shell — Admin UX restructuring.
//
// Sits between the upper Tier focus area and the existing lower deck,
// mounted ONLY while the composable occupant's own tab is focused; hidden
// for every normal Tier. Reuses the occupant's already-projected TierDeck
// and settled customer_policy only — no second read, no new endpoint — and
// the shared StationMetricBlock the Family summary panel already renders
// through, so the right column reads as the same "concise stat list"
// grammar rather than a bespoke table.
//
// Phase 3 correction (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md) — the auditor's final approved UX: the former "View/Edit
// Customer Options" button (which opened a now-retired standalone drawer)
// is retired; its location in this panel's head becomes a `Default |
// Edition 1 | ...` declaration scope strip, via the ONE shared tab
// primitive (StationTabSet). Changing scope is presentation/navigation
// state only — it never saves, publishes, or mutates — and swaps BOTH
// columns' projection to that declaration's own resolved deck/policy
// (buildComposableDeclarationScopes). No new drawer, no third card action,
// no copied Edition controller/state.
//
// Second-round correction — the auditor confirmed a genuine gap: scope
// selection alone left no way to EDIT that declaration from here. The panel
// head keeps one Edit action, but its TARGET now follows `active` (the
// currently selected scope) rather than always addressing Default —
// `onEditDeclaration(active.id)` carries that exact declaration id through
// the existing Tier drawer 'edit' dispatch (PackageTierWorkspace.tsx),
// which the drawer resolves into the right editor/session
// (TierDrawerHost.tsx/useTierDrawerController.ts) — never a second editor.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { StationTabSet } from '@/admin-station/presentation/StationTabSet';
import {
  projectComposableHighlightInclusions,
  summarizeComposableCustomerPolicy,
  type ComposableDeclarationScope,
} from '../../surface/packageTierWorkspace/composableMiddleShell';
import { StationMetricBlock } from '@/admin-station/presentation/StationMetricBlock';
import { PackagesIcon } from '@/admin-station/shell/icons';

interface Props {
  // Always carries at least the 'default' scope — see
  // buildComposableDeclarationScopes's own doc comment.
  scopes: ComposableDeclarationScope[];
  // Opens the Tier drawer's own editor targeting the given declaration id
  // ('default' or a real Edition id) — see this file's own header comment.
  onEditDeclaration: (declarationId: string) => void;
}

export function TierComposableMiddleShell({ scopes, onEditDeclaration }: Props): VNode {
  const [selectedId, setSelectedId] = useState(scopes[0]?.id ?? 'default');
  // A scope can disappear out from under the selection (an Edition deleted/
  // moved to bin elsewhere) — fall back to Default rather than rendering
  // nothing.
  const active = scopes.find((scope) => scope.id === selectedId) ?? scopes[0];

  return (
    <section aria-label="Build Your Own customer selection rules">
      <div class="cz-tier-workspace__panel-head">
        <p class="cz-tier-workspace__panel-label">Customer Selection Rules</p>
        <button
          type="button"
          class="cz-tier-deck__button"
          onClick={() => onEditDeclaration(active?.id ?? 'default')}
        >
          Edit Customer Options
        </button>
      </div>
      <StationTabSet
        label="Customer Selection Rules declaration"
        items={scopes}
        selectedId={active?.id ?? 'default'}
        onSelect={setSelectedId}
        renderPanel={(id) => {
          const scope = scopes.find((candidate) => candidate.id === id);
          if (!scope) return null;
          const highlights = projectComposableHighlightInclusions(scope.deck, scope.policy);
          const stats = summarizeComposableCustomerPolicy(scope.policy);
          return (
            <div class="cz-tier-workspace__composable-shell">
              <div class="cz-tier-workspace__composable-highlights">
                <p class="cz-tier-workspace__panel-label">Featured inclusions</p>
                {highlights.length === 0 ? (
                  <p class="cz-station-empty">Not configured — every inclusion stays not offered.</p>
                ) : (
                  <ul class="cz-tier-workspace__composable-highlight-list">
                    {highlights.map((highlight) => (
                      <li key={highlight.itemId} class="cz-tier-workspace__composable-highlight">
                        <span class="cz-tier-workspace__composable-highlight-icon" aria-hidden="true"><PackagesIcon /></span>
                        <span class="cz-tier-workspace__composable-highlight-name">{highlight.name}</span>
                        {highlight.featured && <span class="cz-tier-workspace__featured-badge">Featured</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div class="cz-tier-workspace__composable-rules">
                <div class="cz-tier-workspace__composable-metrics">
                  {stats.map((metric) => <StationMetricBlock key={metric.id} metric={metric} />)}
                </div>
              </div>
            </div>
          );
        }}
        classes={{ list: 'cz-tier-workspace__scope-tabs' }}
      />
    </section>
  );
}
