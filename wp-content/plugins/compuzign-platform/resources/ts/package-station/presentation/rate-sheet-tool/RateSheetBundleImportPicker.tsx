// Rate Sheet tool — the Bundle engine: browse RATE SHEETS → their priced rows
// → multi-select across sheets → stage → Publish into the open Bundle.
//
// The deliberate difference from "+ Add Service"
// (RateSheetServiceImportPicker.tsx): that engine browses Services and their
// supplied content, and its job is to price supply for the first time. This one
// browses the Rate Sheets themselves, so a Bundle is composed out of work that
// is already priced — "Website" and "Website Revamp" from the Websites sheet,
// "Online Banking" from the Banking sheet, combined and named.
//
// Everything it stages is local — no request until Publish, which appends the
// staged entries as ordinary Bundle rows through `controller.publishRows`, the
// scope-aware command that lands them in the OPEN Bundle and saves once through
// the same full-manager save every other mutation in this tool uses. No second
// endpoint, no second save path, no reduced row.
//
// What lands is a ROW, not a reference: each staged entry carries its own name,
// price, unit, quantity and group, and the resulting Bundle row gets its own
// `CZPRCBI` and the complete Rate Sheet row tooling. Nothing about the source
// sheet's own row changes, and nothing links the two afterwards beyond the
// supplied content they both price.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import type { PackageRateSheetUnit } from '../../types';
import { bundleSourceRowRef, rowDisplayLabel, rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorBundle, RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { InlineCreateSelect, formatUnitPrice } from './rateSheetParts';

interface StagingEntry {
  ref:        string;
  optionId:   string;
  sourceTitle: string;
  label:      string;
  unitPrice:  number;
  per:        PackageRateSheetUnit;
  quantity:   number;
  groupId:    string | null;
}

export function RateSheetBundleImportPicker({
  controller, bundle, bundleKey, sheet, onDone,
}: {
  controller: RateSheetToolController;
  bundle:     RateSheetEditorBundle;
  bundleKey:  string;
  /** The owning sheet — its groups are the only groups a Bundle row can join. */
  sheet:      RateSheetEditorValue;
  onDone:     () => void;
}): VNode {
  const [phase, setPhase]                   = useState<'browse' | 'staging'>('browse');
  const [sheetQuery, setSheetQuery]         = useState('');
  const [rowQuery, setRowQuery]             = useState('');
  const [openSheetKeys, setOpenSheetKeys]   = useState<Set<string>>(new Set());
  const [selectedRefs, setSelectedRefs]     = useState<Set<string>>(new Set());
  const [stagingEntries, setStagingEntries] = useState<StagingEntry[]>([]);
  const [publishing, setPublishing]         = useState(false);

  // A source this Bundle already prices is never offered again — the same
  // one-row-per-source discipline the sheet's own rows keep, checked here so the
  // engine never shows a choice Publish would silently drop. The SHEET's own
  // rows are not consulted: a Bundle row is a separate record.
  const usedOptionIds = useMemo(() => new Set([
    ...bundle.items.map((row) => row.optionId),
    ...stagingEntries.map((entry) => entry.optionId),
  ]), [bundle.items, stagingEntries]);

  const sourceSheets = useMemo(() => {
    const query = sheetQuery.trim().toLowerCase();
    return controller.bundleSources.filter((source) =>
      query === '' || (source.title || 'Untitled Rate Sheet').toLowerCase().includes(query));
  }, [controller.bundleSources, sheetQuery]);

  const rowMatches = (label: string) =>
    rowQuery.trim() === '' || label.toLowerCase().includes(rowQuery.trim().toLowerCase());

  const toggleSheet = (key: string) => setOpenSheetKeys((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleRow = (ref: string) => setSelectedRefs((current) => {
    const next = new Set(current);
    if (next.has(ref)) next.delete(ref); else next.add(ref);
    return next;
  });

  const handleAdd = () => {
    const staged: StagingEntry[] = [];
    for (const source of controller.bundleSources) {
      for (const row of source.rows) {
        const ref = bundleSourceRowRef(source.key, row);
        if (!selectedRefs.has(ref) || usedOptionIds.has(row.optionId)) continue;
        staged.push({
          ref,
          optionId:    row.optionId,
          sourceTitle: source.title || 'Untitled Rate Sheet',
          // The composed row starts from what the source row was worth, then
          // becomes the Bundle's own to name and reprice.
          label:       rowDisplayLabel(row),
          unitPrice:   row.unitPrice,
          per:         row.per,
          quantity:    row.quantity,
          // A source row's group belongs to ITS sheet. Carrying that id across
          // would point at a group this sheet does not have, so a composed row
          // starts ungrouped unless it came from this very sheet.
          groupId:     source.key === controller.selectedKey ? row.groupId : null,
        });
      }
    }
    if (staged.length === 0) return;
    setStagingEntries((current) => [...current, ...staged]);
    setSelectedRefs(new Set());
    setPhase('staging');
  };

  const patchStaging = (index: number, patch: Partial<StagingEntry>) =>
    setStagingEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  const removeStaging = (index: number) =>
    setStagingEntries((current) => current.filter((_, i) => i !== index));

  const requestClose = () => {
    if (stagingEntries.length > 0) {
      const noun = stagingEntries.length === 1 ? 'row' : 'rows';
      if (!window.confirm(`Discard ${stagingEntries.length} staged ${noun} that ${stagingEntries.length === 1 ? "hasn't" : "haven't"} been added to the Bundle?`)) return;
    }
    onDone();
  };

  const handlePublish = async () => {
    setPublishing(true);
    const ok = await controller.publishRows(stagingEntries.map((entry) => ({
      optionId: entry.optionId, unitPrice: entry.unitPrice, per: entry.per,
      quantity: entry.quantity, groupId: entry.groupId, label: entry.label,
    })));
    setPublishing(false);
    if (ok) { setStagingEntries([]); onDone(); }
  };

  if (phase === 'staging') {
    return (
      <div class="cz-rate-sheet-tool__import" aria-label="Combined Bundle rows">
        <div class="cz-rate-sheet-tool__import-head">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setPhase('browse')}>
            ← Back
          </button>
          <strong>Combined rows ({stagingEntries.length})</strong>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
        </div>

        {/* The combination's own name — the Bundle's title, edited here so the
            engine's flow ends where the plan says it does, writing through the
            SAME command the Bundle head's own field uses. */}
        <div class="cz-rate-sheet-tool__focused-head">
          <input
            class="cz-tf-control cz-tf-input"
            value={bundle.title}
            placeholder="Bundle name"
            aria-label="Name for this combination"
            onInput={(event) => controller.setBundleTitle(bundleKey, (event.currentTarget as HTMLInputElement).value)}
          />
        </div>

        {stagingEntries.length === 0 ? (
          <p class="cz-station-empty">No rows staged. Go back and select some from a Rate Sheet.</p>
        ) : (
          <div class="cz-rate-sheet-tool__grid-wrap">
            <table class="cz-rate-sheet-tool__grid">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Unit Price</th>
                  <th scope="col">Per</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Group</th>
                  <th scope="col" aria-label="Row actions"></th>
                </tr>
              </thead>
              <tbody>
                {stagingEntries.map((entry, index) => (
                  <tr key={entry.ref}>
                    <td class="cz-rate-sheet-tool__cell-name">
                      <div class="cz-rate-sheet-tool__cell-name-stack">
                        <input class="cz-tf-control cz-tf-input" type="text" value={entry.label}
                          aria-label={`Name for ${entry.label}`}
                          onInput={(event) => patchStaging(index, { label: (event.currentTarget as HTMLInputElement).value })} />
                        <small>from {entry.sourceTitle}</small>
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
                        editValues={sheet.groups.map((group) => ({ value: group.id, label: group.label }))}
                        placeholder="New group name"
                        onSelect={(next) => patchStaging(index, { groupId: next === '' ? null : next })}
                        onCreate={controller.createGroup}
                        onRename={controller.renameGroup}
                        onDelete={controller.deleteGroup}
                      >
                        <option value="">Ungrouped</option>
                        {sheet.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
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
            {publishing || controller.saving ? 'Adding…' : 'Add to Bundle'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="cz-rate-sheet-tool__import" aria-label="Import from Rate Sheets">
      <div class="cz-rate-sheet-tool__import-head">
        <strong>Import from Rate Sheets</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
      </div>

      <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search Rate Sheets" value={sheetQuery}
        aria-label="Search Rate Sheets" onInput={(event) => setSheetQuery((event.currentTarget as HTMLInputElement).value)} />
      <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search rows" value={rowQuery}
        aria-label="Search rows" onInput={(event) => setRowQuery((event.currentTarget as HTMLInputElement).value)} />

      <div class="cz-rate-sheet-tool__bundle-sources">
        {sourceSheets.length === 0 ? (
          <p class="cz-rate-sheet-tool__picker-note">No Rate Sheets found.</p>
        ) : sourceSheets.map((source) => {
          const open = openSheetKeys.has(source.key);
          const offerable = source.rows.filter((row) => !usedOptionIds.has(row.optionId) && rowMatches(rowDisplayLabel(row)));
          return (
            <div key={source.key} class="cz-rate-sheet-tool__bundle-source">
              <button type="button" class="cz-rate-sheet-tool__bundle-source-head"
                aria-expanded={open} onClick={() => toggleSheet(source.key)}>
                <span>{source.title || 'Untitled Rate Sheet'}{source.status === 'archived' ? ' · Disabled' : ''}</span>
                <small>{offerable.length} of {source.rows.length} rows available</small>
              </button>
              {open && (
                <div class="cz-rate-sheet-tool__import-chip-list">
                  {source.rows.length === 0 ? (
                    <p class="cz-rate-sheet-tool__picker-note">This Rate Sheet prices nothing yet.</p>
                  ) : offerable.length === 0 ? (
                    <p class="cz-rate-sheet-tool__picker-note">Every row here is already in this Bundle.</p>
                  ) : offerable.map((row) => {
                    const ref = bundleSourceRowRef(source.key, row);
                    const active = selectedRefs.has(ref);
                    return (
                      <button type="button" key={rowKey(row)}
                        class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                        aria-pressed={active} onClick={() => toggleRow(ref)}>
                        {rowDisplayLabel(row)}
                        <span class="cz-rate-sheet-tool__import-chip-note"> · {formatUnitPrice(row.unitPrice)}</span>
                        {active && <span aria-hidden="true"> ×</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div class="cz-rate-sheet-tool__import-actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selectedRefs.size === 0}
          onClick={handleAdd}>
          Combine{selectedRefs.size > 0 ? ` (${selectedRefs.size})` : ''}
        </button>
      </div>
    </div>
  );
}
