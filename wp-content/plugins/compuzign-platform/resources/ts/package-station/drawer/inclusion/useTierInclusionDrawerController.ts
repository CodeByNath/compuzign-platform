// Tier Inclusion drawer controller.
//
// The assembling step for TIER_INCLUSION_ENTITY: it resolves the record through
// the Package-owned station read, delivers the four ShellBindings, owns the
// quantity edit session, and routes the save back through the boundary that
// already owns the Tier's selections.
//
// OWNERSHIP: this file holds NO persistence of its own. Quantity is the Tier's
// use of a Rate Sheet row, so it is written by usePackageStation.saveTierFeatures
// — the existing features-module contract — with the Tier's whole selection list
// preserved and exactly one entry's quantity replaced. There is no second
// mutation path, no per-row endpoint, and no draft store outside the station.

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import {
  evaluateModule,
  tierInclusionConnectionModule,
  tierInclusionModule,
} from '@/drawer-kit/utils/moduleNotifications';
import { useAutoDismiss, useGuardedClose } from '@/entity-drawers/shared/drawerChrome';
import { usePackageStation } from '../../usePackageStation';
import type { TierRateSheetSelection } from '../../types';
import type {
  TierInclusionConnectionShellData,
  TierInclusionOverviewShellData,
} from '../schema/bindings/tierInclusion';
import type { TierInclusionQuantityDraft } from '../editors/TierInclusionQuantityEditor';
import { resolveTierInclusion } from './tierInclusionRecord';
import type { TierInclusionRecord } from './tierInclusionRecord';
import type { TierInclusionDrawerContentProps } from './tierInclusionDrawerTypes';

const EMPTY_CONNECTION: TierInclusionConnectionShellData = {
  configured: false,
  primary:    '',
  identity:   '',
};

export function useTierInclusionDrawerController({
  serviceId,
  tierInstanceId,
  slotId,
  itemId,
  initialEdit,
  bridge,
}: TierInclusionDrawerContentProps) {
  const pkg = usePackageStation(serviceId, tierInstanceId, bridge.onMutationComplete);

  const [tab, setTab] = useState<DrawerTabId>('details');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [draft, setDraft] = useState<TierInclusionQuantityDraft | null>(null);
  const [original, setOriginal] = useState<TierInclusionQuantityDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);

  const view = pkg.tierView(slotId);

  // Row identity is (rate_sheet_id, item_id): the sheet comes from the addressed
  // slot's own binding, resolved by id. No other sheet is read.
  const rateSheet = useMemo(
    () => (pkg.service?.rate_sheets ?? []).find(
      (sheet) => sheet.rate_sheet_id === view?.detail.rate_sheet_id,
    ) ?? null,
    [pkg.service, view?.detail.rate_sheet_id],
  );

  const record: TierInclusionRecord | null = useMemo(() => view
    ? resolveTierInclusion(
        itemId,
        view.detail.rate_sheet_selections ?? [],
        rateSheet,
        pkg.service?.package_relationships ?? [],
      )
    : null, [itemId, pkg.service, rateSheet, view]);

  const loading = !pkg.detailLoaded;
  const editing = draft !== null;
  const isDirty = editing && original !== null && draft.quantity !== original.quantity;
  const quantityValid = editing && Number.isInteger(draft.quantity) && draft.quantity >= 1;

  const openQuantityEditor = useCallback(() => {
    if (!record) return;
    const seed = { quantity: record.quantity };
    setDraft(seed);
    setOriginal(seed);
    setOpenPanel(null);
    setSaveErr(null);
  }, [record]);

  // 'edit' row intents open straight into the editor, once the record resolves.
  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || initialEditOpened.current || !record) return;
    initialEditOpened.current = true;
    openQuantityEditor();
  }, [initialEdit, openQuantityEditor, record]);

  const cancelEdit = useCallback(() => {
    setDraft(null);
    setOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  // The Tier's whole selection list is preserved; one entry's quantity changes.
  // Writing the full list is the features module's own contract, not a
  // workaround: the module draft IS the selection set.
  const saveQuantity = useCallback(async () => {
    if (!draft || !view) return;
    const quantity = Math.trunc(draft.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setSaveErr('Quantity must be a whole number of 1 or more.');
      return;
    }
    const selections = view.detail.rate_sheet_items ?? [];
    if (!selections.some((selection) => selection.item_id === itemId)) {
      setSaveErr('This Tier no longer selects this inclusion.');
      return;
    }
    const refs: TierRateSheetSelection[] = selections.map((selection) => ({
      ...selection,
      quantity: selection.item_id === itemId ? quantity : selection.quantity,
    }));

    setSaving(true);
    setSaveErr(null);
    try {
      const res = await pkg.saveTierFeatures(slotId, refs);
      if (!res || !res.success) {
        setSaveErr('Could not save the inclusion quantity.');
        return;
      }
      // usePackageStation patches the features draft in place, so `record`
      // recomputes from the station read on the next render; bridge
      // .onMutationComplete has already refreshed the originating deck.
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the inclusion quantity.');
    } finally {
      setSaving(false);
    }
  }, [draft, itemId, pkg, slotId, view]);

  // Guarded exit — a dirty quantity editor raises the discard prompt and stashes
  // the blocked close / tab switch until the prompt is answered.
  const [exitDialog, setExitDialog] = useState(false);
  const { guard, resolveExit } = useGuardedClose(bridge, () => {
    if (!isDirty) return true;
    setExitDialog(true);
    return false;
  });

  const selectTab = useCallback((next: DrawerTabId) => {
    guard(() => setTab(next));
  }, [guard]);

  const handleExitDiscard = useCallback(() => {
    cancelEdit();
    setExitDialog(false);
    resolveExit();
  }, [cancelEdit, resolveExit]);

  // ── Bindings ────────────────────────────────────────────────────────────────

  const platformStatus = pkg.platformStatus;
  // The features module's own lifecycle, carried into the shared note engine so
  // a pending quantity reads as pending rather than published.
  const hasFeaturesDraft = view?.drafts.features != null;
  const featuresTransition = view?.moduleStatus.features;

  const overviewData: TierInclusionOverviewShellData = {
    name:       record?.name ?? '',
    sourceId:   record?.sourceId ?? null,
    itemId,
    categories: record?.categories ?? [],
    quantity:   record?.quantity ?? 0,
    unitPrice:  record?.unitPrice ?? null,
    lineTotal:  record?.lineTotal ?? null,
    per:        record?.per ?? null,
    resolved:   record?.resolved ?? false,
  };

  const overviewBinding: ShellBinding<TierInclusionOverviewShellData> = {
    data: overviewData,
    state: loading
      ? { status: 'loading', notes: [] }
      : evaluateModule(tierInclusionModule, { resolved: overviewData.resolved }, {
          platformStatus,
          platformLabel:    'Tier',
          moduleTransition: featuresTransition,
          hasDraft:         hasFeaturesDraft,
        }),
    hasDraft: hasFeaturesDraft,
    handlers: record ? { edit: openQuantityEditor } : {},
  };

  const connectionBinding = (
    data: TierInclusionConnectionShellData,
  ): ShellBinding<TierInclusionConnectionShellData> => ({
    data,
    state: loading
      ? { status: 'loading', notes: [] }
      : evaluateModule(tierInclusionConnectionModule, { configured: data.configured }, {
          platformStatus,
          platformLabel: 'Tier',
        }),
    hasDraft: false,
    handlers: {},
  });

  const serviceBinding = connectionBinding(record?.service
    ? { configured: true, primary: record.service.title, identity: String(record.service.id) }
    : EMPTY_CONNECTION);

  const categoryBinding = connectionBinding(record && record.categories.length > 0
    ? { configured: true, primary: record.categories.join(' · '), identity: '' }
    : EMPTY_CONNECTION);

  const rateSheetBinding = connectionBinding(record?.rateSheet
    ? { configured: true, primary: record.rateSheet.title, identity: record.rateSheet.id }
    : EMPTY_CONNECTION);

  return {
    loading,
    // The station read completing is not the same as it succeeding: a failed or
    // unseeded read also lands on detailLoaded. Kept separate so an unreachable
    // station is never reported as a Tier that dropped the inclusion.
    stationAvailable: pkg.station !== null,
    refetch: pkg.refetch,
    record,
    tab,
    selectTab,
    openPanel,
    setOpenPanel,
    editing,
    draft,
    setDraft,
    saving,
    saveErr,
    saveOk,
    isDirty,
    saveDisabled: !isDirty || !quantityValid,
    editorExtras: {
      name:      record?.name ?? '',
      unitPrice: record?.unitPrice ?? null,
      per:       record?.per ?? null,
    },
    overviewBinding,
    serviceBinding,
    categoryBinding,
    rateSheetBinding,
    exitDialog,
    setExitDialog,
    handleExitDiscard,
    saveQuantity,
    cancelEdit,
    requestClose: bridge.close,
  };
}

export type TierInclusionDrawerController = ReturnType<typeof useTierInclusionDrawerController>;
