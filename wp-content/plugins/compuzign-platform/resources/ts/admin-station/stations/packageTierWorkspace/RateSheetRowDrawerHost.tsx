// RateSheetRowDrawerHost — the ADMIN STATION host adapter for the Rate Sheet
// row drawer. The same responsibility pattern as TierDrawerHost /
// CategoryDrawerHost, and just as thin.
//
// Identity: `recordId` is the Rate Sheet row's own `item_id`, a string, exactly
// as the Details/Connections row carried it. It is never coerced, and no other
// row is ever substituted — an invalid or unknown identity renders its honest
// state instead.
//
// This host resolves the active Package Station context (the same host-service
// rule every tier surface uses), mounts the authoritative Package Station hook,
// finds EXACTLY ONE Rate Sheet row by item_id, resolves its relationship and
// group provenance for display, and passes the resolved model plus the
// station's own updateRateSheetRow command into the neutral composition. It
// owns no form state, no validation rules, and calls no endpoint — the command
// round-trip (fresh manager load → patch → atomic save) lives entirely inside
// usePackageStation.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { usePackageStation } from '@/hooks/usePackageStation';
import { PACKAGE_RATE_SHEET_UNITS } from '@/api/types/admin';
import type { PackageRateSheetUnit } from '@/api/types/admin';
import { relationshipDisplayLabel } from '@/entity-drawers/shared/rateSheetLabels';
import { RateSheetRowDrawerContent } from '@/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent';
import type { RateSheetRowModel, RateSheetRowDraft } from '@/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent';
import { useHostService } from '../tierSurface/useHostService';
import type { DrawerContentProps } from '../drawers/drawerTypes';

export function RateSheetRowDrawerHost({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const host = useHostService();
  // 0 is never a real service id — the station holds its unloaded state until
  // the host resolves (the same guard the workspace data source uses).
  const pkg = usePackageStation(host.service?.id ?? 0);

  const closeRef  = useRef(onClose);       closeRef.current  = onClose;
  const footerRef = useRef(setFooter);     footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard); guardRef.current  = setCloseGuard;
  const savedRef  = useRef(onSaved);       savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    // The command advances this host's own station state; this refreshes the
    // wall the drawer was opened from, and only that wall.
    onMutationComplete: () => savedRef.current(),
  }), []);

  // The resolved row model — memoised on the station read so its identity is
  // stable across incidental re-renders (the composition re-seeds its draft
  // only when the record genuinely advances).
  const model = useMemo<RateSheetRowModel | 'invalid' | 'missing' | 'duplicate' | null>(() => {
    if (typeof recordId !== 'string') return 'invalid';
    const rateSheet = pkg.service?.rate_sheet ?? null;
    if (!pkg.detailLoaded || !pkg.service) return null;
    const matches = (rateSheet?.items ?? []).filter((item) => item.item_id === recordId);
    if (matches.length === 0) return 'missing';
    if (matches.length > 1) return 'duplicate';
    const row = matches[0];
    const relationship = (pkg.service.package_relationships ?? []).find(
      (item) => item.item_id === row.source_item_id,
    );
    return {
      itemId:       row.item_id,
      sourceItemId: row.source_item_id,
      optionLabel:  relationship ? relationshipDisplayLabel(relationship) : '(unresolved Rate Sheet item)',
      serviceTitle: relationship?.source_service_title ?? null,
      categories:   relationship?.source_categories ?? [],
      unitPrice:    row.unit_price,
      per:          row.per,
      quantity:     row.quantity,
      groupId:      row.group_id,
      groups:       (rateSheet?.groups ?? []).map((group) => ({ id: group.group_id, label: group.label })),
      units:        PACKAGE_RATE_SHEET_UNITS,
    };
  }, [recordId, pkg.detailLoaded, pkg.service]);

  if (model === 'invalid') {
    return <div class="cz-station-drawer__state">This Rate Sheet row identity is invalid.</div>;
  }
  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading Rate Sheet row…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state" role="alert">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;
  if (model === null)                return <div class="cz-station-drawer__state">Loading Rate Sheet row…</div>;
  if (model === 'missing') {
    return <div class="cz-station-drawer__state">This Rate Sheet row could not be found.</div>;
  }
  if (model === 'duplicate') {
    return <div class="cz-station-drawer__state">This Rate Sheet row identity is duplicated; the sheet needs repair before editing.</div>;
  }

  const save = async (draft: RateSheetRowDraft) => {
    // `per` is validated against PACKAGE_RATE_SHEET_UNITS inside the command;
    // the assertion only narrows the wire type.
    const result = await pkg.updateRateSheetRow(model.itemId, {
      unit_price: draft.unit_price,
      per:        draft.per as PackageRateSheetUnit,
      quantity:   draft.quantity,
      group_id:   draft.group_id,
    });
    return result.ok ? { ok: true as const } : { ok: false as const, message: result.message };
  };

  return (
    <RateSheetRowDrawerContent
      model={model}
      initialEdit={mode === 'edit'}
      saving={pkg.saving}
      onSave={save}
      bridge={bridge}
    />
  );
}
