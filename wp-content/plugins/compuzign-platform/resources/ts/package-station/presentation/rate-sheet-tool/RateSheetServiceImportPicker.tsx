// Rate Sheet tool — the unified "+ Add Service" picker: browse Service
// categories → Services → their inclusions, multi-select across all three,
// stage the chosen inclusions as curated rows, then Publish once to persist
// them into the selected sheet. Replaces the former two-step "Add Source
// Service" + "Add Row" pickers (RateSheetTool.tsx's retired SourcePicker and
// RateSheetSheetEditor's flat candidate list) with one engine, mounted from
// the same place the flat candidate list used to be — inside one sheet's own
// RateSheetSheetEditor, never a sheet-collection-level affordance.
//
// Selecting a Service that isn't yet a connected source connects it
// immediately (`controller.connectServices` — the SAME call the retired
// "Add Source Service" button made), because the Rate Sheet's own read model
// only ever resolves a Service's inclusions once it is a connected source;
// there is no way to preview them otherwise (PackageRepository::sourcePools()
// scopes the inclusion/FAQ pools it reads to the connected `sources` list).
// Everything AFTER that — which inclusions are picked, and their curated
// price/per/qty/group — stays purely local (this component's own state) until
// Publish, which appends them as curated rows and saves once
// (`controller.publishRows`), the same full-manager save every other
// mutation in this tool already uses. No new endpoint, no second save path.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { ServiceSummary } from '@/service-station';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import type { PackageRateSheetUnit } from '../../types';
import type { RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { InlineCreateSelect } from './rateSheetParts';

interface StagingEntry {
  optionId:           string;
  label:              string;
  sourceServiceTitle: string | null;
  unitPrice:          number;
  per:                PackageRateSheetUnit;
  quantity:           number;
  groupId:            string | null;
}

interface CategoryEntry { key: string; name: string; }

type ServiceCategory = ServiceSummary['categories'][number];

function categoryKeyOf(category: ServiceCategory): string {
  return category.slug || (category.id != null ? String(category.id) : category.name);
}

export function RateSheetServiceImportPicker({
  controller, value, onDone,
}: {
  controller: RateSheetToolController;
  value:      RateSheetEditorValue;
  onDone:     () => void;
}): VNode {
  const [phase, setPhase]                       = useState<'browse' | 'staging'>('browse');
  const [categoryQuery, setCategoryQuery]       = useState('');
  const [serviceQuery, setServiceQuery]         = useState('');
  const [inclusionQuery, setInclusionQuery]     = useState('');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds]     = useState<Set<number>>(new Set());
  const [selectedOptionIds, setSelectedOptionIds]       = useState<Set<string>>(new Set());
  const [connectingIds, setConnectingIds]       = useState<Set<number>>(new Set());
  const [stagingEntries, setStagingEntries]     = useState<StagingEntry[]>([]);
  const [publishing, setPublishing]             = useState(false);

  useEffect(() => { controller.loadCatalog(); }, []);

  const categoryEntries = useMemo<CategoryEntry[]>(() => {
    const map = new Map<string, CategoryEntry>();
    for (const service of controller.catalog) {
      for (const category of service.categories) {
        const key = categoryKeyOf(category);
        if (!map.has(key)) map.set(key, { key, name: category.name });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [controller.catalog]);

  const filteredCategories = categoryEntries.filter((category) =>
    category.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()));

  const filteredServices = useMemo(() => controller.catalog.filter((service) => {
    if (selectedCategoryKeys.size > 0) {
      const ownKeys = service.categories.map(categoryKeyOf);
      if (!ownKeys.some((key) => selectedCategoryKeys.has(key))) return false;
    }
    if (serviceQuery.trim() !== '' && !service.title.toLowerCase().includes(serviceQuery.trim().toLowerCase())) return false;
    return true;
  }), [controller.catalog, selectedCategoryKeys, serviceQuery]);

  // Never re-offer a source already a row in this sheet, or already staged in
  // this same open session — the sheet's own one-row-per-source discipline
  // (addEditorRow/addEditorRows) applies here too, just checked earlier so
  // the picker never shows a choice Publish would silently drop.
  const usedOptionIds = useMemo(() => new Set([
    ...value.items.map((row) => row.optionId),
    ...stagingEntries.map((entry) => entry.optionId),
  ]), [value.items, stagingEntries]);

  const availableInclusions = useMemo(() => controller.options.filter((option) =>
    option.sourceServiceId != null
    && selectedServiceIds.has(option.sourceServiceId)
    && !usedOptionIds.has(option.id)
    && (inclusionQuery.trim() === '' || option.label.toLowerCase().includes(inclusionQuery.trim().toLowerCase())),
  ), [controller.options, selectedServiceIds, usedOptionIds, inclusionQuery]);

  const toggleCategory = (key: string) => setSelectedCategoryKeys((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleService = async (service: ServiceSummary) => {
    const wasSelected = selectedServiceIds.has(service.id);
    setSelectedServiceIds((current) => {
      const next = new Set(current);
      if (wasSelected) next.delete(service.id); else next.add(service.id);
      return next;
    });
    if (!wasSelected && !controller.connectedServiceIds.includes(service.id)) {
      setConnectingIds((current) => new Set(current).add(service.id));
      await controller.connectServices([service.id]);
      setConnectingIds((current) => { const next = new Set(current); next.delete(service.id); return next; });
    }
  };

  const toggleOption = (optionId: string) => setSelectedOptionIds((current) => {
    const next = new Set(current);
    if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
    return next;
  });

  const handleImport = () => {
    const chosen = controller.options.filter((option) => selectedOptionIds.has(option.id));
    if (chosen.length === 0) return;
    setStagingEntries((current) => [
      ...current,
      ...chosen.map((option): StagingEntry => ({
        optionId: option.id, label: option.label, sourceServiceTitle: option.sourceServiceTitle,
        unitPrice: 0, per: 'Per item', quantity: 1, groupId: null,
      })),
    ]);
    setSelectedOptionIds(new Set());
    setPhase('staging');
  };

  const requestClose = () => {
    if (stagingEntries.length > 0) {
      const noun = stagingEntries.length === 1 ? 'inclusion' : 'inclusions';
      const verb = stagingEntries.length === 1 ? "hasn't" : "haven't";
      if (!window.confirm(`Discard ${stagingEntries.length} staged ${noun} that ${verb} been published?`)) return;
    }
    onDone();
  };

  const patchStaging = (index: number, patch: Partial<StagingEntry>) =>
    setStagingEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  const removeStaging = (index: number) =>
    setStagingEntries((current) => current.filter((_, i) => i !== index));

  const handlePublish = async () => {
    setPublishing(true);
    const ok = await controller.publishRows(stagingEntries.map((entry) => ({
      optionId: entry.optionId, unitPrice: entry.unitPrice, per: entry.per, quantity: entry.quantity, groupId: entry.groupId,
    })));
    setPublishing(false);
    if (ok) { setStagingEntries([]); onDone(); }
  };

  if (phase === 'staging') {
    return (
      <div class="cz-rate-sheet-tool__import" aria-label="New Inclusions">
        <div class="cz-rate-sheet-tool__import-head">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setPhase('browse')}>
            ← Back
          </button>
          <strong>New Inclusions ({stagingEntries.length})</strong>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
        </div>
        {stagingEntries.length === 0 ? (
          <p class="cz-station-empty">No inclusions staged. Go back to browse and select some.</p>
        ) : (
          <div class="cz-rate-sheet-tool__grid-wrap">
            <table class="cz-rate-sheet-tool__grid">
              <thead>
                <tr>
                  <th scope="col">Supplied content</th>
                  <th scope="col">Unit Price</th>
                  <th scope="col">Per</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Group</th>
                  <th scope="col" aria-label="Row actions"></th>
                </tr>
              </thead>
              <tbody>
                {stagingEntries.map((entry, index) => (
                  <tr key={entry.optionId}>
                    <td class="cz-rate-sheet-tool__cell-name">
                      <div class="cz-rate-sheet-tool__cell-name-stack">
                        <span>{entry.label}</span>
                        <small>{entry.sourceServiceTitle ?? ''}</small>
                      </div>
                    </td>
                    <td>
                      <input class="cz-tf-control cz-tf-input" type="number" min="0" step="0.01" value={entry.unitPrice}
                        aria-label={`Unit price for ${entry.label}`}
                        onInput={(event) => patchStaging(index, { unitPrice: Number((event.currentTarget as HTMLInputElement).value) })} />
                    </td>
                    <td>
                      <InlineCreateSelect
                        value={entry.per}
                        disabled={false}
                        ariaLabel={`Unit for ${entry.label}`}
                        addLabel="+ Add new unit"
                        editLabel="Edit Per values"
                        editValues={controller.units
                          .filter((unit) => !(BUILT_IN_RATE_SHEET_UNITS as readonly string[]).includes(unit))
                          .map((unit) => ({ value: unit, label: unit }))}
                        placeholder="New unit name"
                        onSelect={(next) => patchStaging(index, { per: next })}
                        onCreate={controller.createUnit}
                        onRename={(unit, label) => { controller.renameUnit(unit, label); }}
                      >
                        {controller.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </InlineCreateSelect>
                    </td>
                    <td>
                      <input class="cz-tf-control cz-tf-input" type="number" min="1" step="1" value={entry.quantity}
                        aria-label={`Quantity for ${entry.label}`}
                        onInput={(event) => patchStaging(index, { quantity: Math.max(1, Math.trunc(Number((event.currentTarget as HTMLInputElement).value)) || 1) })} />
                    </td>
                    <td>
                      <InlineCreateSelect
                        value={entry.groupId ?? ''}
                        disabled={false}
                        ariaLabel={`Group for ${entry.label}`}
                        addLabel="+ Add new group"
                        editLabel="Edit Group values"
                        editValues={value.groups.map((group) => ({ value: group.id, label: group.label }))}
                        placeholder="New group name"
                        onSelect={(next) => patchStaging(index, { groupId: next === '' ? null : next })}
                        onCreate={controller.createGroup}
                        onRename={controller.renameGroup}
                        onDelete={controller.deleteGroup}
                      >
                        <option value="">Ungrouped</option>
                        {value.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                      </InlineCreateSelect>
                    </td>
                    <td>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        aria-label={`Remove staged ${entry.label}`} onClick={() => removeStaging(index)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {controller.saveError && <p class="cz-admin-error-msg" role="alert">{controller.saveError}</p>}
        <div class="cz-rate-sheet-tool__import-actions">
          <button type="button" class="cz-admin-btn cz-admin-btn--primary"
            disabled={stagingEntries.length === 0 || publishing || controller.saving}
            onClick={() => { void handlePublish(); }}>
            {publishing || controller.saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="cz-rate-sheet-tool__import" aria-label="Add Service">
      <div class="cz-rate-sheet-tool__import-head">
        <strong>Add Service</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
      </div>
      <div class="cz-rate-sheet-tool__import-columns">
        <div class="cz-rate-sheet-tool__import-column">
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search categories" value={categoryQuery}
            aria-label="Search categories" onInput={(event) => setCategoryQuery((event.currentTarget as HTMLInputElement).value)} />
          <p class="cz-rate-sheet-tool__import-column-label">Browse by category</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {filteredCategories.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">No categories found.</p>
            ) : filteredCategories.map((category) => {
              const active = selectedCategoryKeys.has(category.key);
              return (
                <button type="button" key={category.key}
                  class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                  aria-pressed={active} onClick={() => toggleCategory(category.key)}>
                  {category.name}
                  {active && <span aria-hidden="true"> ×</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div class="cz-rate-sheet-tool__import-column">
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search services" value={serviceQuery}
            aria-label="Search services" onInput={(event) => setServiceQuery((event.currentTarget as HTMLInputElement).value)} />
          <p class="cz-rate-sheet-tool__import-column-label">Browse by service</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {controller.catalogLoading && <p class="cz-station-empty" aria-busy="true">Loading Services…</p>}
            {controller.catalogError && <p class="cz-admin-error-msg" role="alert">{controller.catalogError}</p>}
            {!controller.catalogLoading && !controller.catalogError && filteredServices.length === 0 && (
              <p class="cz-rate-sheet-tool__picker-note">No Services found.</p>
            )}
            {filteredServices.map((service) => {
              const active = selectedServiceIds.has(service.id);
              const connecting = connectingIds.has(service.id);
              return (
                <button type="button" key={service.id}
                  class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                  aria-pressed={active} disabled={connecting || controller.saving}
                  onClick={() => { void toggleService(service); }}>
                  {service.title}
                  {active && <span aria-hidden="true"> ×</span>}
                  {connecting && <span class="cz-rate-sheet-tool__import-chip-note"> · connecting…</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div class="cz-rate-sheet-tool__import-column">
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search inclusions" value={inclusionQuery}
            aria-label="Search inclusions" onInput={(event) => setInclusionQuery((event.currentTarget as HTMLInputElement).value)} />
          <p class="cz-rate-sheet-tool__import-column-label">Browse by Inclusions</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {selectedServiceIds.size === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">Select a Service to see its inclusions.</p>
            ) : availableInclusions.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">No further inclusions available from the selected Service(s).</p>
            ) : availableInclusions.map((option) => {
              const active = selectedOptionIds.has(option.id);
              return (
                <button type="button" key={option.id}
                  class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                  aria-pressed={active} onClick={() => toggleOption(option.id)}>
                  {option.label}
                  {active && <span aria-hidden="true"> ×</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div class="cz-rate-sheet-tool__import-actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selectedOptionIds.size === 0}
          onClick={handleImport}>
          Import{selectedOptionIds.size > 0 ? ` (${selectedOptionIds.size})` : ''}
        </button>
      </div>
    </div>
  );
}
