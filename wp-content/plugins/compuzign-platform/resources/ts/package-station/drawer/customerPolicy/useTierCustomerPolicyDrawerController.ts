// Customer Selection Rules drawer controller.
//
// OWNERSHIP: this file holds NO persistence of its own beyond what
// usePackageStation already owns. customer_policy is saved through the
// existing composable-occupant customer_policy module contract
// (pkg.saveTierCustomerPolicy / pkg.revertTierModule), addressed at the
// COMPOSABLE_TIER_ID sentinel — the same generic per-module draft mechanism
// every other Tier module uses. Settling the draft into the published
// occupant is NOT this drawer's job: it stays the composable occupant's own
// Publish action (the normal occupant editor), matching every other
// module's own "Saved — settle to publish" boundary, so this controller
// never calls pkg.settleTier itself.

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CustomerPolicy } from '@/api/types/cost-builder';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { evaluateModule, tierCustomerPolicyModule } from '@/drawer-kit/utils/moduleNotifications';
import { useAutoDismiss, useGuardedClose } from '@/entity-drawers/shared/drawerChrome';
import { usePackageStation } from '../../usePackageStation';
import { COMPOSABLE_TIER_ID } from '../../vocabulary';
import type { TierCustomerPolicyShellData } from '../schema/bindings/tierCustomerPolicy';
import type { TierCustomerPolicyDrawerContentProps } from './tierCustomerPolicyDrawerTypes';

export function useTierCustomerPolicyDrawerController({
  serviceId,
  tierInstanceId,
  initialEdit,
  bridge,
}: TierCustomerPolicyDrawerContentProps) {
  const pkg = usePackageStation(serviceId, tierInstanceId, bridge.onMutationComplete);

  const [openPanel, setOpenPanel] = useState<string | null>(null);
  // `undefined` = editor closed; `null` is a legitimate open draft VALUE (no
  // policy configured, or an explicit pending clear) — the same distinction
  // the rejected round's own useTierModuleEditing.ts drew, carried over here.
  const [draft, setDraft] = useState<CustomerPolicy | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);

  const view = pkg.tierView(COMPOSABLE_TIER_ID);
  const detail = view?.detail ?? null;

  // The published occupant's own currently-selected rows only — never the
  // full bound Rate Sheet catalogue. `detail.rate_sheet_selections` is
  // already the occupant's own persisted `rate_sheet_items` resolved 1:1
  // (usePackageStation.buildTierViewFromSlot) — the exact "3 selected rows"
  // set, not "45 Rate Sheet rows". `buildRateSheetCatalogue` is deliberately
  // NOT reused here: it exists to build the full sheet catalogue for the
  // Tier Features "Add from Rate Sheet…" picker and only APPENDS existing
  // selections it can't already find in that full list — it does not filter
  // down to selections, so passing it the occupant's selections here still
  // returned every catalogue row.
  const rateSheetCatalogue = useMemo(
    () => detail ? detail.rate_sheet_selections.filter((row) => row.resolved) : [],
    [detail],
  );

  const loading = !pkg.detailLoaded;
  // The smallest correct "genuinely published/manageable" gate — the same
  // occupant.enabled fact the card itself gates the action's visibility on
  // (platform_status === 'active'), never a bare occupant_id existence
  // check. Re-checked here defensively in case the drawer is reached with a
  // stale card.
  const eligible = detail?.enabled === true;
  const editing = draft !== undefined;

  const openEditor = useCallback(() => {
    if (!detail) return;
    setDraft(detail.customer_policy ?? null);
    setOpenPanel(null);
    setSaveErr(null);
  }, [detail]);

  // An 'edit' open intent opens straight into the editor, once the occupant
  // resolves — mirrors tier-inclusion's own initial-edit effect.
  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || initialEditOpened.current || !detail) return;
    initialEditOpened.current = true;
    openEditor();
  }, [initialEdit, openEditor, detail]);

  const cancelEdit = useCallback(() => {
    setDraft(undefined);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const saveDraft = useCallback(async () => {
    if (draft === undefined) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await pkg.saveTierCustomerPolicy(COMPOSABLE_TIER_ID, draft);
      if (!res || !res.success) {
        setSaveErr('Could not save the customer selection rules.');
        return;
      }
      setDraft(undefined);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the customer selection rules.');
    } finally {
      setSaving(false);
    }
  }, [draft, pkg]);

  const discardDraft = useCallback(async () => {
    setSaveErr(null);
    const res = await pkg.revertTierModule(COMPOSABLE_TIER_ID, 'customer_policy');
    if (!res?.success) setSaveErr('Failed to discard changes.');
  }, [pkg]);

  const [exitDialog, setExitDialog] = useState(false);
  const { guard, resolveExit } = useGuardedClose(bridge, () => {
    if (!editing) return true;
    setExitDialog(true);
    return false;
  });

  const requestClose = useCallback(() => guard(() => bridge.close()), [guard, bridge]);

  const handleExitDiscard = useCallback(() => {
    cancelEdit();
    setExitDialog(false);
    resolveExit();
  }, [cancelEdit, resolveExit]);

  const hasDraft = !!view && view.drafts.customer_policy !== null;
  const moduleTransition = view?.moduleStatus.customer_policy;
  const tierPricingComplete = !!detail && (detail.price !== null || detail.contact) && !!detail.billing_cycle;

  const shellData: TierCustomerPolicyShellData = { policy: detail?.customer_policy ?? null };

  const overviewBinding: ShellBinding<TierCustomerPolicyShellData> = {
    data: shellData,
    state: loading
      ? { status: 'loading', notes: [] }
      : evaluateModule(tierCustomerPolicyModule, { count: shellData.policy?.items.length ?? 0 }, {
          platformStatus:   detail?.enabled ? 'active' : 'disabled',
          platformLabel:    'Build Your Own',
          moduleTransition,
          hasDraft,
          disabled:         detail?.is_explicitly_disabled ?? false,
          parentReady:      tierPricingComplete,
          parentLabel:      'Tier Overview',
        }),
    hasDraft,
    handlers: detail ? { edit: openEditor, 'discard-draft': discardDraft } : {},
  };

  return {
    loading,
    stationAvailable: pkg.station !== null,
    refetch: pkg.refetch,
    eligible,
    detail,
    openPanel,
    setOpenPanel,
    editing,
    draft,
    setDraft,
    saving,
    saveErr,
    saveOk,
    rateSheetCatalogue,
    overviewBinding,
    exitDialog,
    setExitDialog,
    handleExitDiscard,
    saveDraft,
    cancelEdit,
    requestClose,
  };
}

export type TierCustomerPolicyDrawerController = ReturnType<typeof useTierCustomerPolicyDrawerController>;
