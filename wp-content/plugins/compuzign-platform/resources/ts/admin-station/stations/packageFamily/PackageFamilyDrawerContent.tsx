// Package Family drawer content — the second registered drawer template.
//
// It proves the drawer axis is genuinely entity-agnostic: the shell, the
// controller, the tabs, and the registry are untouched by its arrival. Only this
// content knows what a Package Family is.
//
// Identity, end to end: the card carried the string `group_id`, the intent
// carried that same string, the controller stored it unchanged, and this content
// resolves the record by matching `group_id` — then sends that identical string
// to the overview endpoint on save. One id, from API record to card to drawer to
// mutation, with no conversion and no surrogate key anywhere in the path.
//
// View shows the family's own details AND its connections (the dependents the
// list route reports: Services, Rate Sheet rows, Tier selections) — the
// relationships that make a family a commercial bucket rather than a label.
//
// Mutation boundary: unlike the Service Category Group template, there is no
// shared authoritative state hook for families to reuse — the legacy tree owns
// that logic inside its own UI components (PackageFamiliesSection /
// DynamicStationManager), which must not cross into this bundle. So this content
// calls the pure endpoint directly and reflects the server's returned record,
// which is the same contract that hook would provide. Overview edits are saved
// as the station's draft; applying/publishing stays with the lifecycle actions
// and is deliberately not reinvented here.

import { useState } from 'preact/hooks';
import type { DrawerContentProps } from '../drawers/drawerTypes';
import type { PackageFamilyItem } from '@/api/types/admin';
import { savePackageFamilyOverview } from '@/api/endpoints/admin';
import { usePackageFamilyRecord } from './usePackageFamilyRecord';
import { resolvePackageFamilyCardStatus } from './cardAdapter';
import { StationStatusPill } from '../../presentation/StationStatusPill';

export function PackageFamilyDrawerContent({ recordId, mode, onClose, onSaved }: DrawerContentProps) {
  const { record, loading, error } = usePackageFamilyRecord(recordId);

  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }
  if (!record) {
    // Resolved cleanly but the record is gone (deleted, or filtered out of the
    // current scope) — a neutral, honest dead-end rather than a blank body.
    return (
      <div class="cz-station-empty">
        <p>This Package Family is no longer available.</p>
        <button type="button" class="cz-record-drawer__link" onClick={onClose}>Close</button>
      </div>
    );
  }

  return <PackageFamilyDrawerLoaded record={record} mode={mode} onSaved={onSaved} />;
}

interface LoadedProps {
  record:  PackageFamilyItem;
  mode:    DrawerContentProps['mode'];
  onSaved: () => void;
}

function PackageFamilyDrawerLoaded({ record, mode, onSaved }: LoadedProps) {
  // The live record for this drawer. Seeded from the list projection and then
  // advanced by each save's server response, so View reflects an edit without
  // refetching this drawer's own read — which would clear the record and flash
  // the form.
  //
  // The wall behind is a SEPARATE useApi instance, so refreshing it (onSaved)
  // cannot disturb what is on screen here. Both are updated, neither flashes.
  const [current, setCurrent] = useState<PackageFamilyItem>(record);

  const handleSaved = (saved: PackageFamilyItem | null) => {
    if (saved) setCurrent(saved);
    onSaved();
  };

  return mode === 'edit'
    ? <EditBody record={current} onSaved={handleSaved} />
    : <ViewBody record={current} />;
}

// ── View tab ─────────────────────────────────────────────────────────────────

function ViewBody({ record }: { record: PackageFamilyItem }) {
  // Connections are read straight from the record's own dependents projection —
  // counts the backend already reports, never derived or estimated here.
  const connections: Array<{ id: string; label: string; value: number }> = [
    { id: 'services',        label: 'Services',        value: record.dependents.services },
    { id: 'rate-sheet-rows', label: 'Rate Sheet rows', value: record.dependents.rate_sheet_rows },
    { id: 'tier-selections', label: 'Tier selections', value: record.dependents.tier_selections },
  ];

  return (
    <div class="cz-record-drawer__view">
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Status</span>
        <StationStatusPill status={resolvePackageFamilyCardStatus(record)} />
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Name</span>
        <span class="cz-record-drawer__field-value">{record.label}</span>
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Description</span>
        <span class="cz-record-drawer__field-value">
          {record.description.trim() || <span class="cz-record-drawer__muted">No description</span>}
        </span>
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Assigned Services</span>
        <span class="cz-record-drawer__field-value">{record.assigned_service_count}</span>
      </div>

      {/* Connections — what this family holds together. Looped, never named
          one by one, so a future dependent is a data change. */}
      {connections.map((connection) => (
        <div key={connection.id} class="cz-record-drawer__row">
          <span class="cz-record-drawer__field-label">{connection.label}</span>
          <span class="cz-record-drawer__field-value">{connection.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Edit tab ─────────────────────────────────────────────────────────────────

function EditBody({
  record,
  onSaved,
}: {
  record:  PackageFamilyItem;
  onSaved: (record: PackageFamilyItem | null) => void;
}) {
  const [name, setName] = useState(record.label);
  const [description, setDescription] = useState(record.description);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const trimmedName = name.trim();
  const dirty = name !== record.label || description !== record.description;
  const canSave = dirty && trimmedName !== '' && !saving;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // The mutation boundary — the same string group_id the card dispatched.
      const response = await savePackageFamilyOverview(record.group_id, {
        name: trimmedName,
        description,
      });
      // Reported only on success: a failed save must not refresh the wall, which
      // would imply a change that never happened.
      onSaved(response.group);
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="cz-record-drawer__edit">
      <div class="cz-station-field">
        <label class="cz-station-field__label" for="cz-package-family-name">Name</label>
        <input
          id="cz-package-family-name"
          type="text"
          class="cz-station-field__input"
          value={name}
          onInput={(e) => { setName((e.target as HTMLInputElement).value); setSavedAt(null); }}
        />
      </div>

      <div class="cz-station-field">
        <label class="cz-station-field__label" for="cz-package-family-description">Description</label>
        <textarea
          id="cz-package-family-description"
          class="cz-station-field__textarea"
          value={description}
          onInput={(e) => { setDescription((e.target as HTMLTextAreaElement).value); setSavedAt(null); }}
        />
      </div>

      {saveError && <p class="cz-record-drawer__error" role="alert">{saveError}</p>}

      <div class="cz-record-drawer__edit-actions">
        <button type="button" class="cz-record-drawer__save" disabled={!canSave} onClick={save}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {savedAt !== null && !dirty && <span class="cz-record-drawer__saved">Saved</span>}
      </div>
    </div>
  );
}
