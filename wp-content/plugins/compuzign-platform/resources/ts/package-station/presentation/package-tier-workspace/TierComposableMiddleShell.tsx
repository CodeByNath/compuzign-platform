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
// keeps one Edit action, but its TARGET now follows `active` (the
// currently selected scope) rather than always addressing Default —
// `onEditDeclaration(active.id)` carries that exact declaration id through
// the existing Tier drawer 'edit' dispatch (PackageTierWorkspace.tsx),
// which the drawer resolves into the right editor/session
// (TierDrawerHost.tsx/useTierDrawerController.ts) — never a second editor.
//
// Live-UI correction (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md, Phase 3 correction): the auditor's live validation found
// the scope mechanism itself sound but flagged two pure UI defects. First,
// scope selection is now LIFTED OUT of this file into PackageTierWorkspace.tsx
// (`selectedId`/`onSelectScope`, both controlled props) so the SAME
// selection also drives the upper Build Your Own detail card there — this
// file no longer owns any local selection state at all. Second, this panel
// is re-laid-out so the two-column deck's left column is Featured
// Inclusions ONLY (no tabs/button), and the right column carries, in order:
// the declaration tabs (aligned top-right), that declaration's own Customer
// Selection Rules metrics, and one `Edit` primary action (aligned
// bottom-right) — reusing the exact same
// `cz-tier-deck__button cz-tier-deck__button--primary` treatment
// TierDetailPanel.tsx's own buttons use, and the exact same
// `cz-tier-workspace__composable-shell`/`-highlights`/`-rules` grid/columns
// already defined in admin-station.css; only placement inside the existing
// `-rules` column changed.

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
  // The one selected declaration scope — owned by PackageTierWorkspace.tsx
  // so the SAME selection also drives the upper Build Your Own detail card;
  // this file is a controlled consumer only.
  selectedId: string;
  onSelectScope: (id: string) => void;
  // Opens the Tier drawer's own editor targeting the given declaration id
  // ('default' or a real Edition id) — see this file's own header comment.
  onEditDeclaration: (declarationId: string) => void;
}

export function TierComposableMiddleShell({ scopes, selectedId, onSelectScope, onEditDeclaration }: Props): VNode {
  // A scope can disappear out from under the selection (an Edition deleted/
  // moved to bin elsewhere) — fall back to Default rather than rendering
  // nothing.
  const active = scopes.find((scope) => scope.id === selectedId) ?? scopes[0];
  const highlights = active ? projectComposableHighlightInclusions(active.deck, active.policy) : [];

  return (
    <section aria-label="Build Your Own customer selection rules">
      <p class="cz-tier-workspace__panel-label">Customer Selection Rules</p>
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
          <StationTabSet
            label="Customer Selection Rules declaration"
            items={scopes}
            selectedId={active?.id ?? 'default'}
            onSelect={onSelectScope}
            renderPanel={(id) => {
              const scope = scopes.find((candidate) => candidate.id === id);
              if (!scope) return null;
              const stats = summarizeComposableCustomerPolicy(scope.policy);
              return (
                <div class="cz-tier-workspace__composable-metrics">
                  {stats.map((metric) => <StationMetricBlock key={metric.id} metric={metric} />)}
                </div>
              );
            }}
            classes={{ list: 'cz-station-tabset__list cz-tier-workspace__scope-tabs' }}
          />
          <button
            type="button"
            class="cz-tier-deck__button cz-tier-deck__button--primary cz-tier-workspace__composable-edit"
            onClick={() => onEditDeclaration(active?.id ?? 'default')}
          >
            Edit
          </button>
        </div>
      </div>
    </section>
  );
}
