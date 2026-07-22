// Rate Sheet row — the host-neutral drawer composition.
//
// The mature Rate Sheet row behaviour recovered as a REAL entity composition on
// the shared drawer kit — the same EntityDrawer / shell / module system the
// Package Family, Category, Service, and Tier drawers use, never a form of
// disabled inputs:
//
//   Overview | Connections tabs (EntityDrawer + RATE_SHEET_ROW_ENTITY)
//     Overview     → Row Overview + Commercial Terms read modules
//     Connections  → Source & Provenance + Connection Status read modules
//   Edit         → the Commercial Terms module alone switches to
//                  InlineEditorShell (unit price / per / quantity / group);
//                  sibling modules remain readable.
//
// It knows NO host: no Admin Station shell, no StepContext, no surface binding,
// no focused Family/Tier, no endpoint. It receives one resolved row model, an
// opening mode, the saving state, a save command, and the neutral
// EntityDrawerHostBridge — so the same composition can mount under any host
// that satisfies the bridge.
//
// A successful save reports through bridge.onMutationComplete (the host
// refreshes the wall the drawer was opened from — and only that wall), shows
// the shared saved toast, and returns to read mode; the drawer stays open,
// matching the established shared drawer behaviour. Close is guarded while an
// edit is dirty (the same window.confirm guard the Tier composition keeps).

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import {
  evaluateModule,
  rateSheetRowModule,
  rateSheetRowCommercialModule,
  rateSheetRowConnectionModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { RateSheetRowLike } from '@/drawer-kit/utils/moduleNotifications';
import { useAutoDismiss } from '../shared/drawerChrome';
import { RATE_SHEET_ROW_ENTITY } from '../schema/entities/rateSheetRow';
import type {
  RateSheetRowOverviewShellData,
  RateSheetRowCommercialShellData,
  RateSheetRowProvenanceShellData,
  RateSheetRowConnectionShellData,
} from '../schema/bindings/rateSheetRow';

/** The resolved Rate Sheet row as the host adapter supplies it. Identity and
 *  provenance fields are display-only here; the composition never mutates or
 *  re-derives them. `quantity` is the sheet row's own authoritative quantity. */
export interface RateSheetRowModel {
  itemId: string;
  sourceItemId: string;
  optionLabel: string;
  /** The relationship's source type ('inclusion' | 'faq'), null when unresolved. */
  sourceType: string | null;
  serviceTitle: string | null;
  categories: string[];
  /** The priced relationship resolves to a live source. */
  resolved: boolean;
  /** The relationship is administratively disabled. */
  sourceDisabled: boolean;
  /** The station's platform status — drives the shared module lifecycle notes. */
  platformStatus: string;
  unitPrice: number;
  per: string;
  quantity: number;
  groupId: string | null;
  groups: readonly { id: string; label: string }[];
  units: readonly string[];
  /** The Tiers whose current selections include this row (occupant identity + label). */
  tierSelections: readonly { id: string; label: string }[];
}

/** The only fields an edit may change — mirrors the station command's patch. */
export interface RateSheetRowDraft {
  unit_price: number;
  per: string;
  quantity: number;
  group_id: string | null;
}

export type RateSheetRowSaveResult = { ok: true } | { ok: false; message: string };

export interface RateSheetRowDrawerContentProps {
  model: RateSheetRowModel;
  initialEdit: boolean;
  saving: boolean;
  onSave: (patch: RateSheetRowDraft) => Promise<RateSheetRowSaveResult>;
  bridge: EntityDrawerHostBridge;
}

function draftFromModel(model: RateSheetRowModel): RateSheetRowDraft {
  return {
    unit_price: model.unitPrice,
    per:        model.per,
    quantity:   model.quantity,
    group_id:   model.groupId,
  };
}

function isSameDraft(a: RateSheetRowDraft, b: RateSheetRowDraft): boolean {
  return a.unit_price === b.unit_price
    && a.per === b.per
    && a.quantity === b.quantity
    && a.group_id === b.group_id;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  inclusion: 'Included Feature',
  faq:       'Common Question',
};

export function RateSheetRowDrawerContent({
  model,
  initialEdit,
  saving,
  onSave,
  bridge,
}: RateSheetRowDrawerContentProps): VNode {
  const [tab, setTab] = useState<DrawerBaseTabId>('details');
  const [editing, setEditing] = useState(initialEdit);
  const [draft, setDraft] = useState<RateSheetRowDraft>(() => draftFromModel(model));
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // The authoritative row (post-save, the host's advanced state flows back in
  // through `model`); the draft re-seeds whenever the record itself moves on.
  useEffect(() => { setDraft(draftFromModel(model)); }, [model]);

  const isDirty = useMemo(() => !isSameDraft(draft, draftFromModel(model)), [draft, model]);
  const draftValid = Number.isFinite(draft.unit_price) && draft.unit_price >= 0
    && Number.isInteger(draft.quantity) && draft.quantity >= 1;

  // Shell-chrome close (Escape / backdrop / header ×) is guarded while a dirty
  // edit is open — the same direct confirm guard the Tier composition keeps.
  useEffect(() => {
    bridge.setCloseGuard(() => {
      if (!editing || !isDirty) return true;
      return window.confirm('Discard unsaved changes to this Rate Sheet row?');
    });
    return () => bridge.setCloseGuard(null);
  }, [bridge, editing, isDirty]);

  useAutoDismiss(saveOk, () => setSaveOk(false), 4000);

  const startEdit = () => {
    setTab('details');
    setEditing(true);
  };

  // Record footer in read mode only; InlineEditorShell owns the edit footer.
  useEffect(() => {
    if (editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => bridge.close()}>Close</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={startEdit}>Edit row</button>
      </div>,
    );
    return () => bridge.setFooter(null);
  }, [bridge, editing]);

  const handleSave = async () => {
    setSaveErr(null);
    const result = await onSave({
      unit_price: draft.unit_price,
      per:        draft.per,
      quantity:   draft.quantity,
      group_id:   draft.group_id,
    });
    if (!result.ok) {
      setSaveErr(result.message);
      return;
    }
    setSaveOk(true);
    setEditing(false);
    bridge.onMutationComplete?.();
  };

  const groupLabel = model.groupId !== null
    ? model.groups.find((group) => group.id === model.groupId)?.label ?? 'Unknown group'
    : 'Ungrouped';

  // One shared DNA evaluation per module axis — the same evaluateModule engine
  // every drawer module uses (status + notes rendered by the shell frame).
  const rowLike: RateSheetRowLike = {
    resolved: model.resolved,
    sourceDisabled: model.sourceDisabled,
    unitPrice: model.unitPrice,
    tierSelectionCount: model.tierSelections.length,
  };
  const noteCtx = { platformStatus: model.platformStatus, platformLabel: 'Package Station' };

  const overviewBinding: ShellBinding<RateSheetRowOverviewShellData> = {
    data: {
      optionLabel: model.optionLabel,
      sourceTypeLabel: model.sourceType !== null
        ? SOURCE_TYPE_LABELS[model.sourceType] ?? model.sourceType
        : 'Unknown source',
      serviceTitle: model.serviceTitle,
      groupLabel,
    },
    state: evaluateModule(rateSheetRowModule, rowLike, noteCtx),
    hasDraft: false,
    handlers: {},
  };

  const commercialBinding: ShellBinding<RateSheetRowCommercialShellData> = {
    data: {
      unitPriceLabel: `$${model.unitPrice.toFixed(2)}`,
      per: model.per,
      quantityLabel: String(model.quantity),
      groupLabel,
    },
    state: evaluateModule(rateSheetRowCommercialModule, rowLike, noteCtx),
    hasDraft: false,
    handlers: { edit: startEdit },
  };

  const provenanceBinding: ShellBinding<RateSheetRowProvenanceShellData> = {
    data: {
      optionLabel: model.optionLabel,
      serviceTitle: model.serviceTitle,
      categoriesLabel: model.categories.join(', '),
      referenceLabel: `${model.itemId} · ${model.sourceItemId}`,
    },
    state: evaluateModule(rateSheetRowModule, rowLike, noteCtx),
    hasDraft: false,
    handlers: {},
  };

  const connectionBinding: ShellBinding<RateSheetRowConnectionShellData> = {
    data: {
      resolutionLabel: model.resolved ? 'Resolved' : 'Unresolved',
      availabilityLabel: model.sourceDisabled ? 'Source disabled' : model.resolved ? 'Available' : 'Source missing',
      tierSelections: model.tierSelections.map((tier) => ({ id: tier.id, label: tier.label })),
    },
    state: evaluateModule(rateSheetRowConnectionModule, rowLike, noteCtx),
    hasDraft: false,
    handlers: {},
  };

  return (
    <EntityDrawer
      entity={RATE_SHEET_ROW_ENTITY}
      tab={tab}
      onSelectTab={setTab}
      bindings={{
        overview:   overviewBinding,
        commercial: commercialBinding,
        provenance: provenanceBinding,
        connection: connectionBinding,
      }}
      openPanel={openPanel}
      onTogglePanel={(module) => setOpenPanel((open) => (open === module ? null : module))}
      editing={editing ? {
        module: 'commercial',
        session: {
          draft,
          patch: (patch) => setDraft((current) => ({ ...current, ...patch })),
          replace: (next) => setDraft(next as RateSheetRowDraft),
          onSave: handleSave,
          onCancel: () => { setDraft(draftFromModel(model)); setSaveErr(null); setEditing(false); },
          saving,
          saveErr,
          isDirty,
          saveDisabled: !isDirty || !draftValid,
          extras: { groups: model.groups, units: model.units },
        },
      } : null}
    >
      {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
    </EntityDrawer>
  );
}
