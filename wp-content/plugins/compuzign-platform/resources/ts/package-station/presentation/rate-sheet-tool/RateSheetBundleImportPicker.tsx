// Rate Sheet tool — the Bundle import engine.
//
// The CALLER chooses the source, through its own trigger — "+ Add Service" or
// "+ Add Rate Sheet" — and this engine then shows THAT source's browse only.
// It never stacks both catalogues, a source switch and a basket into one panel:
//
//   source = 'services'      Category → Service → Inclusions   (3 columns, the
//                            same browse "+ Add Service" uses on the sheet's
//                            own rows)
//   source = 'rate-sheets'   Rate Sheet → its priced rows      (2 columns)
//
// The running basket is a full-width strip BELOW those columns, so it has room
// to read and the browse keeps its own.
//
// `Import` appends every selected entry to the open Bundle through
// `controller.publishRows` — the scope-aware command that lands them in the
// OPEN Bundle and saves once through the same full-manager save every other
// mutation in this tool uses. No second endpoint, no second save path.
//
// There is deliberately no staging/pricing table: an import creates a Bundle
// membership around an existing Rate Sheet row. The Bundle's commercial price,
// unit, quantity and group belong to its own compiled row; the referenced row's
// identity and definition remain authoritative on its Rate Sheet.
//
// The Services branch keeps the connect-on-select behaviour "+ Add Service"
// has always had (`controller.connectServices`): the Rate Sheet read model only
// resolves a Service's inclusions once that Service is a connected source.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { ServiceSummary } from '@/service-station';
import { bundleSourceRowRef, rowDisplayLabel } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorBundle, RateSheetRowEntry } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { formatUnitPrice } from './rateSheetParts';

/** Which catalogue this engine is browsing. The caller's trigger decides it. */
export type BundleImportSource = 'services' | 'rate-sheets';

/**
 * One chosen existing Rate Sheet row, whichever browse path found it. The
 * exact sheet/item address becomes the membership target; none of the source
 * row's identity is recreated or replaced here.
 */
interface SelectedEntry extends RateSheetRowEntry {
  ref:    string;
  label:  string;
  origin: string;
}

interface CategoryEntry { key: string; name: string; }

type ServiceCategory = ServiceSummary['categories'][number];

function categoryKeyOf(category: ServiceCategory): string {
  return category.slug || (category.id != null ? String(category.id) : category.name);
}

export function RateSheetBundleImportPicker({
  controller, bundle, source, onImport, onDone,
}: {
  controller: RateSheetToolController;
  bundle:     RateSheetEditorBundle;
  source:     BundleImportSource;
  /** Where Import lands the selection — the OPEN Bundle's own `publishRows`
   *  for an existing Bundle, or `commitNewBundle` when this engine is what
   *  creates a not-yet-existing one. Either way, one save. */
  onImport:   (entries: readonly RateSheetRowEntry[]) => Promise<boolean>;
  onDone:     () => void;
}): VNode {
  const [categoryQuery, setCategoryQuery]   = useState('');
  const [serviceQuery, setServiceQuery]     = useState('');
  const [sheetQuery, setSheetQuery]         = useState('');
  const [rowQuery, setRowQuery]             = useState('');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds]     = useState<Set<number>>(new Set());
  const [selectedSheetKeys, setSelectedSheetKeys]       = useState<Set<string>>(new Set());
  const [connectingIds, setConnectingIds]   = useState<Set<number>>(new Set());
  const [selected, setSelected]             = useState<SelectedEntry[]>([]);
  const [importing, setImporting]           = useState(false);

  const browsingServices = source === 'services';

  useEffect(() => { if (browsingServices) controller.loadCatalog(); }, [browsingServices]);

  // An exact Rate Sheet row already wrapped by this Bundle is never offered
  // again. Other rows remain distinct even when they share a Manager source.
  const usedMemberRefs = useMemo(() => new Set([
    ...bundle.items.map((row) => `${row.memberRateSheetId ?? ''}\0${row.memberRateSheetItemId ?? ''}`),
    ...selected.map((entry) => entry.ref),
  ]), [bundle.items, selected]);

  const toggleIn = <T,>(current: Set<T>, value: T): Set<T> => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const matchesRow = (label: string) =>
    rowQuery.trim() === '' || label.toLowerCase().includes(rowQuery.trim().toLowerCase());

  // ── Services browse ───────────────────────────────────────────────────────

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

  const availableInclusions = useMemo<SelectedEntry[]>(() => controller.bundleSources.flatMap((sheet) =>
    sheet.rows
      .filter((row) => row.id !== ''
        && row.sourceServiceId != null
        && selectedServiceIds.has(row.sourceServiceId)
        && !usedMemberRefs.has(bundleSourceRowRef(sheet.id, row))
        && matchesRow(rowDisplayLabel(row)))
      .map((row) => ({
        ref:       bundleSourceRowRef(sheet.id, row),
        optionId:  row.optionId,
        label:     rowDisplayLabel(row),
        origin:    sheet.title || 'Untitled Rate Sheet',
        unitPrice: row.unitPrice,
        per:       row.per,
        quantity:  row.quantity,
        groupId:   null,
        memberRateSheetId: sheet.id,
        memberRateSheetItemId: row.id,
        memberRateSheetItemPlatformId: row.platformId,
      })),
  ), [controller.bundleSources, selectedServiceIds, usedMemberRefs, rowQuery]);

  const toggleService = async (service: ServiceSummary) => {
    const wasSelected = selectedServiceIds.has(service.id);
    setSelectedServiceIds((current) => toggleIn(current, service.id));
    if (!wasSelected && !controller.connectedServiceIds.includes(service.id)) {
      setConnectingIds((current) => new Set(current).add(service.id));
      await controller.connectServices([service.id]);
      setConnectingIds((current) => { const next = new Set(current); next.delete(service.id); return next; });
    }
  };

  // ── Rate Sheets browse ────────────────────────────────────────────────────

  const filteredSheets = useMemo(() => {
    const query = sheetQuery.trim().toLowerCase();
    return controller.bundleSources.filter((sheet) =>
      query === '' || (sheet.title || 'Untitled Rate Sheet').toLowerCase().includes(query));
  }, [controller.bundleSources, sheetQuery]);

  /** The picked sheets' rows, grouped by the sheet they belong to. */
  const availableSheetRows = useMemo(() => controller.bundleSources
    .filter((sheet) => selectedSheetKeys.has(sheet.key))
    .map((sheet) => ({
      key:   sheet.key,
      title: sheet.title || 'Untitled Rate Sheet',
      entries: sheet.rows
        .filter((row) => row.id !== ''
          && !usedMemberRefs.has(bundleSourceRowRef(sheet.id, row))
          && matchesRow(rowDisplayLabel(row)))
        .map((row): SelectedEntry => ({
          ref:       bundleSourceRowRef(sheet.id, row),
          optionId:  row.optionId,
          label:     rowDisplayLabel(row),
          origin:    sheet.title || 'Untitled Rate Sheet',
          // The referenced row remains authoritative and is never touched.
          // These existing fields preserve the membership's established
          // authoring shape while its exact row address carries identity.
          unitPrice: row.unitPrice,
          per:       row.per,
          quantity:  row.quantity,
          // A source row's group belongs to ITS sheet, so the membership starts
          // ungrouped; the Bundle's own row carries the commercial group.
          groupId:   null,
          memberRateSheetId: sheet.id,
          memberRateSheetItemId: row.id,
          memberRateSheetItemPlatformId: row.platformId,
        })),
    })),
  [controller.bundleSources, selectedSheetKeys, usedMemberRefs, rowQuery]);

  // ── Basket ────────────────────────────────────────────────────────────────

  const chooseEntry = (entry: SelectedEntry) =>
    setSelected((current) => (current.some((chosen) => chosen.ref === entry.ref)
      ? current
      : [...current, entry]));

  const dropEntry = (ref: string) =>
    setSelected((current) => current.filter((entry) => entry.ref !== ref));

  const requestClose = () => {
    if (selected.length > 0) {
      const noun = selected.length === 1 ? 'entry' : 'entries';
      if (!window.confirm(`Discard ${selected.length} selected ${noun} that ${selected.length === 1 ? "hasn't" : "haven't"} been imported?`)) return;
    }
    onDone();
  };

  const handleImport = async () => {
    setImporting(true);
    const ok = await onImport(selected.map((entry) => ({
      optionId: entry.optionId, unitPrice: entry.unitPrice, per: entry.per,
      quantity: entry.quantity, groupId: entry.groupId, label: entry.label,
      memberRateSheetId: entry.memberRateSheetId,
      memberRateSheetItemId: entry.memberRateSheetItemId,
      memberRateSheetItemPlatformId: entry.memberRateSheetItemPlatformId,
    })));
    setImporting(false);
    if (ok) { setSelected([]); onDone(); }
  };

  const busy = importing || controller.saving;

  const entryChip = (entry: SelectedEntry, note?: string) => (
    <button type="button" key={entry.ref}
      class="cz-rate-sheet-tool__import-chip"
      onClick={() => chooseEntry(entry)}>
      {entry.label}
      {note !== undefined && <span class="cz-rate-sheet-tool__import-chip-note"> · {note}</span>}
    </button>
  );

  return (
    <div
      class="cz-rate-sheet-tool__import"
      aria-label={browsingServices ? 'Add Service to this Bundle' : 'Add Rate Sheet content to this Bundle'}
    >
      <div class="cz-rate-sheet-tool__import-head">
        <strong>{browsingServices ? 'Add Service' : 'Add Rate Sheet'}</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
      </div>

      {browsingServices ? (
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
                    aria-pressed={active}
                    onClick={() => setSelectedCategoryKeys((current) => toggleIn(current, category.key))}>
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
            <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search inclusions" value={rowQuery}
              aria-label="Search inclusions" onInput={(event) => setRowQuery((event.currentTarget as HTMLInputElement).value)} />
            <p class="cz-rate-sheet-tool__import-column-label">Browse by inclusions</p>
            <div class="cz-rate-sheet-tool__import-chip-list">
              {selectedServiceIds.size === 0 ? (
                <p class="cz-rate-sheet-tool__picker-note">Select a Service to see its inclusions.</p>
              ) : availableInclusions.length === 0 ? (
                <p class="cz-rate-sheet-tool__picker-note">No further inclusions available from the selected Service(s).</p>
              ) : availableInclusions.map((entry) => entryChip(entry))}
            </div>
          </div>
        </div>
      ) : (
        <div class="cz-rate-sheet-tool__import-columns cz-rate-sheet-tool__import-columns--pair">
          <div class="cz-rate-sheet-tool__import-column">
            <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search Rate Sheets" value={sheetQuery}
              aria-label="Search Rate Sheets" onInput={(event) => setSheetQuery((event.currentTarget as HTMLInputElement).value)} />
            <p class="cz-rate-sheet-tool__import-column-label">Browse by Rate Sheet</p>
            <div class="cz-rate-sheet-tool__import-chip-list">
              {filteredSheets.length === 0 ? (
                <p class="cz-rate-sheet-tool__picker-note">No Rate Sheets found.</p>
              ) : filteredSheets.map((sheet) => {
                const active = selectedSheetKeys.has(sheet.key);
                return (
                  <button type="button" key={sheet.key}
                    class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                    aria-pressed={active}
                    onClick={() => setSelectedSheetKeys((current) => toggleIn(current, sheet.key))}>
                    {sheet.title || 'Untitled Rate Sheet'}{sheet.status === 'archived' ? ' · Disabled' : ''}
                    {active && <span aria-hidden="true"> ×</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div class="cz-rate-sheet-tool__import-column">
            <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search rows" value={rowQuery}
              aria-label="Search rows" onInput={(event) => setRowQuery((event.currentTarget as HTMLInputElement).value)} />
            <p class="cz-rate-sheet-tool__import-column-label">Browse by row</p>
            <div class="cz-rate-sheet-tool__import-chip-list">
              {availableSheetRows.length === 0 ? (
                <p class="cz-rate-sheet-tool__picker-note">Select a Rate Sheet to see its rows.</p>
              ) : availableSheetRows.map((group) => (
                <div key={group.key} class="cz-rate-sheet-tool__import-group">
                  <p class="cz-rate-sheet-tool__import-group-title">{group.title}</p>
                  {group.entries.length === 0 ? (
                    <p class="cz-rate-sheet-tool__picker-note">Every row here is already in this Bundle.</p>
                  ) : (
                    <div class="cz-rate-sheet-tool__import-group-chips">
                      {group.entries.map((entry) => entryChip(entry, formatUnitPrice(entry.unitPrice)))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The basket, full width beneath the browse — its own room to read. */}
      <div class="cz-rate-sheet-tool__import-basket">
        <p class="cz-rate-sheet-tool__import-column-label">Selected ({selected.length})</p>
        {selected.length === 0 ? (
          <p class="cz-rate-sheet-tool__picker-note">
            Nothing selected yet. Pick supplied content above.
          </p>
        ) : (
          <div class="cz-rate-sheet-tool__import-group-chips">
            {selected.map((entry) => (
              <button type="button" key={entry.ref}
                class="cz-rate-sheet-tool__import-chip cz-rate-sheet-tool__import-chip--active"
                aria-label={`Remove ${entry.label} from the selection`}
                title={`From ${entry.origin}`}
                onClick={() => dropEntry(entry.ref)}>
                {entry.label}
                <span aria-hidden="true"> ×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {controller.saveError && <p class="cz-admin-error-msg" role="alert">{controller.saveError}</p>}
      <div class="cz-rate-sheet-tool__import-actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary"
          disabled={selected.length === 0 || busy}
          onClick={() => { void handleImport(); }}>
          {busy ? 'Importing…' : `Import${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}
