// Service Category Group drawer content — the first real registered drawer
// template.
//
// It is entity-specific by design (that is what a drawer template is): it knows
// how to load its record and which authoritative provider mutates it. What it
// must NOT do is leak that knowledge into the shell or controller — those stay
// generic and resolve this content only through a key.
//
// Data ownership is unchanged: reads go through the bundle-safe record hook, and
// edits go through useServiceCategoryGroupStation — the SAME authoritative state
// layer the old drawer uses. No CRUD or backend ownership is rebuilt here; this
// is a fresh view/edit surface over the existing boundary.
//
// Identity stays numeric: the drawer opens with a numeric recordId, the record
// is resolved by that id, and every mutation calls the endpoint with the numeric
// term_id. Nothing is stringified.

import { useState } from 'preact/hooks';
import type { DrawerContentProps } from '../drawers/drawerTypes';
import type { ServiceCategoryGroupStationItem } from '@/api/types/admin';
import { useServiceCategoryGroupStation } from '@/hooks/useServiceCategoryGroupStation';
import { useServiceCategoryGroupRecord } from './useServiceCategoryGroupRecord';
import { resolveCategoryGroupCardStatus } from './cardAdapter';
import { StationStatusPill } from '../../presentation/StationStatusPill';

export function ServiceCategoryGroupDrawerContent({ recordId, mode, onClose }: DrawerContentProps) {
  const { record, loading, error } = useServiceCategoryGroupRecord(recordId);

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
        <p>This Service Category Group is no longer available.</p>
        <button type="button" class="cz-record-drawer__link" onClick={onClose}>Close</button>
      </div>
    );
  }

  // Inner component: the mutation hook is called unconditionally here, only once
  // the record exists, so the Rules of Hooks hold across loading → loaded.
  return <ServiceCategoryGroupDrawerLoaded record={record} mode={mode} />;
}

interface LoadedProps {
  record: ServiceCategoryGroupStationItem;
  mode:   DrawerContentProps['mode'];
}

function ServiceCategoryGroupDrawerLoaded({ record, mode }: LoadedProps) {
  // No onRefresh: the authoritative hook updates its own state from each save's
  // server response, so the drawer reflects the change without a list refetch —
  // which would clear the record and flash the form. Refreshing the card wall
  // behind the drawer is a deferred cross-surface concern, not this seam's.
  const station = useServiceCategoryGroupStation(record);
  const group = station.group;

  return mode === 'edit'
    ? <EditBody station={station} />
    : <ViewBody group={group} status={resolveCategoryGroupCardStatus(group)} assigned={station.assignedCount} />;
}

// ── View tab ─────────────────────────────────────────────────────────────────

interface ViewBodyProps {
  group:    ServiceCategoryGroupStationItem;
  status:   ReturnType<typeof resolveCategoryGroupCardStatus>;
  assigned: number;
}

function ViewBody({ group, status, assigned }: ViewBodyProps) {
  return (
    <div class="cz-record-drawer__view">
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Status</span>
        <StationStatusPill status={status} />
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Name</span>
        <span class="cz-record-drawer__field-value">{group.name}</span>
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Description</span>
        <span class="cz-record-drawer__field-value">
          {group.description.trim() || <span class="cz-record-drawer__muted">No description</span>}
        </span>
      </div>
      <div class="cz-record-drawer__row">
        <span class="cz-record-drawer__field-label">Assigned Categories</span>
        <span class="cz-record-drawer__field-value">{assigned}</span>
      </div>
    </div>
  );
}

// ── Edit tab ─────────────────────────────────────────────────────────────────

function EditBody({ station }: { station: ReturnType<typeof useServiceCategoryGroupStation> }) {
  const group = station.group;
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const trimmedName = name.trim();
  const dirty = name !== group.name || description !== group.description;
  const canSave = dirty && trimmedName !== '' && !saving;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Authoritative mutation boundary — numeric term_id inside saveOverview.
      await station.saveOverview({ name: trimmedName, description });
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
        <label class="cz-station-field__label" for="cz-scg-name">Name</label>
        <input
          id="cz-scg-name"
          type="text"
          class="cz-station-field__input"
          value={name}
          onInput={(e) => { setName((e.target as HTMLInputElement).value); setSavedAt(null); }}
        />
      </div>

      <div class="cz-station-field">
        <label class="cz-station-field__label" for="cz-scg-description">Description</label>
        <textarea
          id="cz-scg-description"
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
