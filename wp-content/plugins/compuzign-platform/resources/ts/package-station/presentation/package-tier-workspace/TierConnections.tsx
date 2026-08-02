// Tier Workspace Connections — one continuous browser over the three
// connected-record sections: Family Group, Groups, and Rate Sheet.
//
// The Package-owned surface projection supplies every row, status, empty
// state, action, and target through `flattenConnectionSections`, which
// reshapes the existing category/tab projection into that fixed three-section
// order and derives no relationship of its own. This component owns search
// text, browse selection, status selection, and accordion expansion only; it
// fetches nothing, derives no relationship, encodes no route, and opens no
// drawer directly. Its rows are the shared connected-record row, so the
// whole-focus Settings lane presents the same record identically.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  ConnectionActionId,
  ConnectionNavigationCategory,
  ConnectionRow,
  ConnectionSection,
  ConnectionSectionId,
  ConnectionTarget,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import { flattenConnectionSections } from '../../surface/packageTierWorkspace/connectionNavigation';
import { ChevronDownIcon, SearchIcon } from '@/admin-station/shell/icons';
import { connectionStatus, TierConnectionRow } from './TierConnectionRow';

interface Props {
  navigation: ConnectionNavigationCategory[];
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}

type BrowseFilter = 'all' | ConnectionSectionId;

const BROWSE_OPTIONS: { id: BrowseFilter; label: string }[] = [
  { id: 'all',          label: 'All connections' },
  { id: 'family-group', label: 'Family Group' },
  { id: 'groups',       label: 'Groups' },
  { id: 'rate-sheet',   label: 'Rate Sheet' },
];

// Family Group opens by default; Groups and Rate Sheet start collapsed. A
// browse filter that isolates one section may display it open without
// mutating this stored state, so returning to "All connections" restores it.
const INITIAL_EXPANDED: Record<ConnectionSectionId, boolean> = {
  'family-group': true,
  groups:         false,
  'rate-sheet':   false,
};

interface FilteredSection extends ConnectionSection {
  filteredRows: ConnectionRow[];
}

function matchesSearch(row: ConnectionRow, needle: string): boolean {
  return !needle || `${row.name} ${row.reference}`.toLowerCase().includes(needle);
}

export function TierConnections({ navigation, onIntent }: Props): VNode {
  const sections = useMemo(() => flattenConnectionSections(navigation), [navigation]);

  const [query, setQuery]       = useState('');
  const [browse, setBrowse]     = useState<BrowseFilter>('all');
  const [status, setStatus]     = useState('');
  const [expanded, setExpanded] = useState<Record<ConnectionSectionId, boolean>>(INITIAL_EXPANDED);

  // Status options come from the rows the projection actually supplies, never
  // a second hard-coded inventory.
  const statuses = useMemo(() => {
    const present = new Map<string, string>();
    for (const section of sections) {
      for (const row of section.rows) {
        if (!present.has(row.status)) present.set(row.status, connectionStatus(row.status).label);
      }
    }
    return [...present.entries()];
  }, [sections]);

  const needle = query.trim().toLowerCase();
  const visibleSections: FilteredSection[] = sections
    .filter((section) => browse === 'all' || browse === section.id)
    .map((section) => ({
      ...section,
      filteredRows: section.rows.filter((row) => matchesSearch(row, needle) && (!status || row.status === status)),
    }));

  return (
    <div class="cz-tier-deck__connections">
      <div class="cz-tier-deck__toolbar">
        <span class="cz-tier-deck__search">
          <SearchIcon class="cz-tier-deck__search-icon" />
          <input
            class="cz-tf-control cz-tf-input cz-tier-deck__control--search"
            type="search"
            placeholder="Search connections…"
            value={query}
            aria-label="Search connections"
            onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </span>
        <select
          class="cz-tf-control cz-tf-select"
          value={browse}
          aria-label="Browse connections"
          onChange={(event) => setBrowse((event.currentTarget as HTMLSelectElement).value as BrowseFilter)}
        >
          {BROWSE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select
          class="cz-tf-control cz-tf-select"
          value={status}
          aria-label="Filter by status"
          disabled={statuses.length === 0}
          onChange={(event) => setStatus((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">All statuses</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div class="cz-tier-deck__accordion">
        {visibleSections.map((section) => (
          <ConnectionAccordionSection
            key={section.id}
            section={section}
            isOpen={browse === section.id || expanded[section.id]}
            onToggle={() => setExpanded((current) => ({ ...current, [section.id]: !current[section.id] }))}
            onIntent={onIntent}
          />
        ))}
      </div>
    </div>
  );
}

function ConnectionAccordionSection({ section, isOpen, onToggle, onIntent }: {
  section: FilteredSection;
  isOpen: boolean;
  onToggle: () => void;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  const headerId = `cz-tier-connections__${section.id}-header`;
  const panelId  = `cz-tier-connections__${section.id}-panel`;

  return (
    <section class="cz-tier-deck__accordion-section">
      <h4 class="cz-tier-deck__accordion-heading">
        <button
          type="button"
          id={headerId}
          class="cz-tier-deck__accordion-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span class="cz-tier-deck__accordion-chevron" aria-hidden="true"><ChevronDownIcon /></span>
          <span class="cz-tier-deck__lane-title">{section.label}</span>
          <span class="cz-tier-deck__accordion-count">{section.filteredRows.length}</span>
        </button>
      </h4>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        class="cz-tier-deck__accordion-panel"
        hidden={!isOpen}
      >
        {section.rows.length === 0 ? (
          <p class="cz-station-empty">{section.emptyState}</p>
        ) : section.filteredRows.length === 0 ? (
          <p class="cz-station-empty">No connections match the current filters.</p>
        ) : (
          <ul class="cz-station-list">
            {section.filteredRows.map((row) => (
              <TierConnectionRow key={row.id} row={row} onIntent={onIntent} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
