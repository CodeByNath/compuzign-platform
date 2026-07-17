import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { PackageFamilyItem } from '@/api/types/admin';
import { createPackageFamily, savePackageFamilyOverview } from '@/api/endpoints/admin';
import { PackageRateSheetEditor } from './PackageRateSheetEditor';
import type { RateSheetEditorValue } from './PackageRateSheetEditor';

export interface ConnectionDrawerValue {
  id: string;
  sourceLabel: string;
  groupId: string | null;
  order: number;
  disabled: boolean;
  decoratedLabel: string | null;
  availability: string;
  sourceHealth: string;
}

export interface CommercialGroupDrawerValue {
  id: string;
  label: string;
  order: number;
  memberIds: string[];
  sourceOptions: readonly { id: string; label: string }[];
  isNew?: boolean;
}

export interface RateRowDrawerValue {
  id: string;
  optionLabel: string;
  serviceTitle: string | null;
  serviceCategories: readonly string[];
  unitPrice: number;
  per: string;
  quantity: number;
  groupId: string | null;
  groups: readonly { id: string; label: string }[];
  units: readonly string[];
}

export interface FamilyAssignmentDrawerValue {
  serviceId: number;
  serviceTitle: string;
  groupId: string | null;
  groups: readonly { id: string; label: string }[];
}

export interface RateSheetSetupDrawerValue {
  rateSheet: RateSheetEditorValue;
  configured: boolean;
  options: readonly { id: string; label: string }[];
  units: readonly string[];
  sourcePicker: boolean;
}

function DrawerFooter({ ctx, saving, disabled, onApply, applyLabel = 'Apply changes', dangerLabel, onDanger }: {
  ctx: StepContext;
  saving?: boolean;
  disabled?: boolean;
  onApply?: () => void | Promise<void>;
  applyLabel?: string;
  dangerLabel?: string;
  onDanger?: () => void;
}) {
  return (
    <div class="cz-action-shell__footer">
      {dangerLabel && <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={onDanger}>{dangerLabel}</button>}
      <div class="cz-tf-footer__spacer" />
      <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>Cancel</button>
      {onApply && <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={saving || disabled} onClick={() => void onApply()}>{saving ? 'Working…' : applyLabel}</button>}
    </div>
  );
}

function PackageFamilyDrawerStep({ ctx }: { ctx: StepContext }) {
  const group = ctx.stepData.group as PackageFamilyItem | undefined;
  const onChanged = ctx.stepData.onChanged as () => void;
  const [name, setName] = useState(group?.label ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = async () => {
    if (!name.trim()) return;
    setSaving(true); setError(null);
    try {
      if (group) await savePackageFamilyOverview(group.group_id, { name: name.trim(), description: description.trim() });
      else await createPackageFamily({ name: name.trim(), description: description.trim() || undefined });
      onChanged();
      ctx.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the Package Family.');
    } finally { setSaving(false); }
  };
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} saving={saving} disabled={!name.trim()} onApply={apply} applyLabel={group ? 'Save draft' : 'Create Family'} />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, saving, name, description]);
  return <div class="cz-focused-drawer-form">
    <div class="cz-focused-drawer-card">
      <h3>{group ? 'Package Family overview' : 'New Package Family'}</h3>
      <label class="cz-tf-field"><span>Name</span><input class="cz-tf-input" value={name} onInput={(event) => setName(event.currentTarget.value)} /></label>
      <label class="cz-tf-field"><span>Description</span><textarea class="cz-tf-textarea" value={description} onInput={(event) => setDescription(event.currentTarget.value)} /></label>
      {group && <p class="cz-sp-tier-table__muted">{group.dependents.services} Services · {group.dependents.rate_sheet_rows} Rate Sheet rows · {group.dependents.tier_selections} Tier selections</p>}
      {group?.has_draft && <p class="cz-admin-notice">This family already has pending overview changes. Saving replaces that overview draft; lifecycle actions remain on the family card.</p>}
      {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
    </div>
  </div>;
}

function ConnectionDrawerStep({ ctx }: { ctx: StepContext }) {
  const initial = ctx.stepData.value as ConnectionDrawerValue;
  const groups = ctx.stepData.groups as readonly { id: string; label: string }[];
  const onApply = ctx.stepData.onApply as (value: ConnectionDrawerValue) => void;
  const [value, setValue] = useState(initial);
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} onApply={() => { onApply(value); ctx.close(); }} />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, value, onApply]);
  return <div class="cz-focused-drawer-form"><div class="cz-focused-drawer-card">
    <h3>Source Connection</h3>
    <label class="cz-tf-field"><span>Source</span><input class="cz-tf-input" value={value.sourceLabel} readOnly /></label>
    <div class="cz-focused-drawer-grid">
      <label class="cz-tf-field"><span>Commercial Group</span><select class="cz-tf-select" value={value.groupId ?? ''} onChange={(event) => setValue({ ...value, groupId: event.currentTarget.value || null })}><option value="">Ungrouped</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}</select></label>
      <label class="cz-tf-field"><span>Order</span><input class="cz-tf-input" type="number" min="0" value={value.order} onInput={(event) => setValue({ ...value, order: Number(event.currentTarget.value) })} /></label>
      <label class="cz-tf-field"><span>State</span><select class="cz-tf-select" value={value.disabled ? 'disabled' : 'enabled'} onChange={(event) => setValue({ ...value, disabled: event.currentTarget.value === 'disabled' })}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></label>
      <label class="cz-tf-field"><span>Availability</span><input class="cz-tf-input" value={value.availability} readOnly /></label>
    </div>
    <label class="cz-tf-field"><span>Manager label</span><input class="cz-tf-input" value={value.decoratedLabel ?? ''} placeholder="Use source label" onInput={(event) => setValue({ ...value, decoratedLabel: event.currentTarget.value.trim() || null })} /></label>
    <label class="cz-tf-field"><span>Source health</span><input class="cz-tf-input" value={value.sourceHealth} readOnly /></label>
    <p class="cz-sp-tier-table__muted">Source identity, health, and derived availability are read-only. Changes apply to the current manager draft.</p>
  </div></div>;
}

function FamilyAssignmentDrawerStep({ ctx }: { ctx: StepContext }) {
  const initial = ctx.stepData.value as FamilyAssignmentDrawerValue;
  const onApply = ctx.stepData.onApply as (value: FamilyAssignmentDrawerValue) => void;
  const [value, setValue] = useState(initial);
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} onApply={() => { onApply(value); ctx.close(); }} applyLabel="Apply to draft" />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, value, onApply]);
  return <div class="cz-focused-drawer-form"><div class="cz-focused-drawer-card">
    <h3>Package Family assignment</h3>
    <label class="cz-tf-field"><span>Service</span><input class="cz-tf-input" value={value.serviceTitle} readOnly /></label>
    <label class="cz-tf-field"><span>Package Family</span><select class="cz-tf-select" value={value.groupId ?? ''} onChange={(event) => setValue({ ...value, groupId: event.currentTarget.value || null })}>
      <option value="">Ungrouped</option>
      {value.groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}
    </select></label>
    <p class="cz-sp-tier-table__muted">Assignment is Package-owned. Applying updates the current manager draft; use Save changes on Station Home to persist it.</p>
  </div></div>;
}

function CommercialGroupDrawerStep({ ctx }: { ctx: StepContext }) {
  const initial = ctx.stepData.value as CommercialGroupDrawerValue;
  const onApply = ctx.stepData.onApply as (value: CommercialGroupDrawerValue) => void;
  const onDelete = ctx.stepData.onDelete as (() => void) | undefined;
  const [value, setValue] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const apply = () => { onApply(value); ctx.close(); };
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} disabled={!value.label.trim()} onApply={apply}
      dangerLabel={!value.isNew ? (confirmDelete ? 'Confirm delete' : 'Delete group') : undefined}
      onDanger={() => { if (!confirmDelete) setConfirmDelete(true); else { onDelete?.(); ctx.close(); } }} />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, value, confirmDelete, onApply, onDelete]);
  const selected = useMemo(() => new Set(value.memberIds), [value.memberIds]);
  return <div class="cz-focused-drawer-form"><div class="cz-focused-drawer-card">
    <h3>Commercial Group</h3>
    <label class="cz-tf-field"><span>Name</span><input class="cz-tf-input" value={value.label} onInput={(event) => setValue({ ...value, label: event.currentTarget.value })} /></label>
    <div class="cz-tf-field"><span>Included sources</span><div class="cz-focused-drawer-checklist">
      {value.sourceOptions.map((source) => <label class="cz-focused-drawer-check" key={source.id}><input type="checkbox" checked={selected.has(source.id)} onChange={(event) => setValue({ ...value, memberIds: event.currentTarget.checked ? [...value.memberIds, source.id] : value.memberIds.filter((id) => id !== source.id) })} /><span>{source.label}</span></label>)}
      {value.sourceOptions.length === 0 && <p class="cz-sp-tier-table__muted">No source connections are available.</p>}
    </div></div>
    {confirmDelete && <div class="cz-admin-error-msg">Deleting reassigns {value.memberIds.length} source{value.memberIds.length === 1 ? '' : 's'} to Ungrouped. Select Confirm delete to continue.</div>}
    <p class="cz-sp-tier-table__muted">Descriptions are deferred because the current Commercial Group schema has no description field.</p>
  </div></div>;
}

function RateRowDrawerStep({ ctx }: { ctx: StepContext }) {
  const initial = ctx.stepData.value as RateRowDrawerValue;
  const onApply = ctx.stepData.onApply as (value: RateRowDrawerValue) => void;
  const [value, setValue] = useState(initial);
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} disabled={value.unitPrice < 0 || value.quantity < 1} onApply={() => { onApply(value); ctx.close(); }} />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, value, onApply]);
  return <div class="cz-focused-drawer-form"><div class="cz-focused-drawer-card">
    <h3>Rate Sheet Row</h3>
    <label class="cz-tf-field"><span>Source option</span><input class="cz-tf-input" value={value.optionLabel} readOnly /></label>
    <div class="cz-focused-drawer-grid">
      <label class="cz-tf-field"><span>Service</span><input class="cz-tf-input" value={value.serviceTitle ?? '—'} readOnly /></label>
      <label class="cz-tf-field"><span>Category</span><input class="cz-tf-input" value={value.serviceCategories.join(', ') || '—'} readOnly /></label>
      <label class="cz-tf-field"><span>Unit price</span><input class="cz-tf-input" type="number" min="0" step="0.01" value={value.unitPrice} onInput={(event) => setValue({ ...value, unitPrice: Number(event.currentTarget.value) })} /></label>
      <label class="cz-tf-field"><span>Per</span><select class="cz-tf-select" value={value.per} onChange={(event) => setValue({ ...value, per: event.currentTarget.value })}>{value.units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}</select></label>
      <label class="cz-tf-field"><span>Quantity</span><input class="cz-tf-input" type="number" min="1" step="1" value={value.quantity} onInput={(event) => setValue({ ...value, quantity: Number(event.currentTarget.value) })} /></label>
      <label class="cz-tf-field"><span>Group</span><select class="cz-tf-select" value={value.groupId ?? ''} onChange={(event) => setValue({ ...value, groupId: event.currentTarget.value || null })}><option value="">Ungrouped</option>{value.groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}</select></label>
    </div>
    <p class="cz-sp-tier-table__muted">Source option and provenance are resolved live and cannot be edited here.</p>
  </div></div>;
}

function RateSheetSetupDrawerStep({ ctx }: { ctx: StepContext }) {
  const initial = ctx.stepData.value as RateSheetSetupDrawerValue;
  const onApply = ctx.stepData.onApply as (value: RateSheetEditorValue) => void | Promise<void>;
  const onCancel = ctx.stepData.onCancel as () => void;
  const onConnectSources = ctx.stepData.onConnectSources as ((value: RateSheetEditorValue, serviceIds: number[]) => Promise<RateSheetEditorValue>) | undefined;
  const [value, setValue] = useState(initial.rateSheet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const applied = useRef(false);
  useEffect(() => { ctx.setPanelMode('manager-wide'); return () => ctx.setPanelMode('standard'); }, [ctx.setPanelMode]);
  useEffect(() => () => { if (!applied.current) onCancel(); }, []);
  const apply = async () => {
    setSaving(true); setError(null);
    try {
      await onApply(value);
      applied.current = true;
      ctx.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply the Rate Sheet changes.');
    } finally { setSaving(false); }
  };
  useEffect(() => {
    ctx.setFooter(<DrawerFooter ctx={ctx} saving={saving} onApply={apply} applyLabel="Apply to draft" />);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, value, saving]);
  return <div class="cz-focused-drawer-form cz-focused-drawer-form--wide">
    <PackageRateSheetEditor
      value={value}
      onChange={setValue}
      configured={initial.configured}
      options={initial.options}
      units={initial.units}
      sourcePicker={initial.sourcePicker}
      saving={saving}
      saveError={error}
      onSave={apply}
      onCancel={ctx.close}
      onConnectSources={onConnectSources ? async (serviceIds) => setValue(await onConnectSources(value, serviceIds)) : undefined}
      embedded
    />
    {error && <div class="cz-admin-error-msg" role="alert">{error}</div>}
  </div>;
}

function PriceSettingsDrawerStep({ ctx }: { ctx: StepContext }) {
  useEffect(() => { ctx.setFooter(<DrawerFooter ctx={ctx} />); return () => ctx.setFooter(null); }, [ctx.setFooter, ctx.close]);
  return <div class="cz-focused-drawer-form"><div class="cz-focused-drawer-card">
    <h3>Price Settings</h3>
    <p>Price Settings are audit-only in this release. Currency, tax mode, default billing cycle, rounding, and pricing notes do not yet have an authoritative persisted schema.</p>
    <div class="cz-admin-notice">Rate values continue to be managed per Rate Sheet row through the existing Package Manager draft.</div>
  </div></div>;
}

function config(id: string, title: string, component: ActionConfig['steps'][number]['component'], initialStepData: Record<string, unknown>): ActionConfig {
  return { id, mode: 'drawer', title, initialStepData, steps: [{ id: 'detail', title, component }] };
}

export const buildPackageFamilyDrawerConfig = (group: PackageFamilyItem | undefined, onChanged: () => void) => config(`category-group-${group?.group_id ?? 'new'}`, group ? `Edit ${group.label}` : 'New Package Family', PackageFamilyDrawerStep, { group, onChanged });
export const buildConnectionDrawerConfig = (value: ConnectionDrawerValue, groups: readonly { id: string; label: string }[], onApply: (value: ConnectionDrawerValue) => void) => config(`connection-${value.id}`, 'Edit Connection', ConnectionDrawerStep, { value, groups, onApply });
export const buildFamilyAssignmentDrawerConfig = (value: FamilyAssignmentDrawerValue, onApply: (value: FamilyAssignmentDrawerValue) => void) => config(`service-family-${value.serviceId}`, `Assign ${value.serviceTitle}`, FamilyAssignmentDrawerStep, { value, onApply });
export const buildCommercialGroupDrawerConfig = (value: CommercialGroupDrawerValue, onApply: (value: CommercialGroupDrawerValue) => void, onDelete?: () => void) => config(`commercial-group-${value.id}`, value.isNew ? 'New Commercial Group' : `Edit ${value.label}`, CommercialGroupDrawerStep, { value, onApply, onDelete });
export const buildRateRowDrawerConfig = (value: RateRowDrawerValue, onApply: (value: RateRowDrawerValue) => void) => config(`rate-row-${value.id}`, `Edit ${value.optionLabel}`, RateRowDrawerStep, { value, onApply });
export const buildRateSheetSetupDrawerConfig = (value: RateSheetSetupDrawerValue, onApply: (value: RateSheetEditorValue) => void | Promise<void>, onCancel: () => void, onConnectSources?: (value: RateSheetEditorValue, serviceIds: number[]) => Promise<RateSheetEditorValue>) => config('rate-sheet-setup', value.configured ? 'Rate Sheet setup' : 'Create Rate Sheet', RateSheetSetupDrawerStep, { value, onApply, onCancel, onConnectSources });
export const buildPriceSettingsDrawerConfig = () => config('price-settings-audit', 'Price Settings', PriceSettingsDrawerStep, {});
