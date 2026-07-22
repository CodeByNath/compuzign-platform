// RateSheetSetupDrawerHost — the ADMIN STATION host adapter for initialising
// the Package Station's one Rate Sheet configuration.
//
// Setup names no existing record (the sheet does not exist yet), so the
// dispatched recordId is not read here. The host resolves the active Package
// Station context, mounts the authoritative Package Station hook, and supplies
// the neutral composition with its own fresh read: the configured-sheet
// summary (which drives the drawer's passive already-configured state, so a
// stale wall button can never restart setup) and the live relationship rows
// the manager commit will materialise. The command itself still refuses to
// replace an already-configured sheet — no duplicate is ever created through
// this drawer.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { usePackageStation } from '@/hooks/usePackageStation';
import { relationshipDisplayLabel } from '@/entity-drawers/shared/rateSheetLabels';
import { RateSheetSetupContent } from '@/entity-drawers/rate-sheet/RateSheetSetupContent';
import { projectEligibleSetupRows } from '@/entity-drawers/rate-sheet/rateSheetSetupModel';
import { useHostService } from '../tierSurface/useHostService';
import type { DrawerContentProps } from '../drawers/drawerTypes';

export function RateSheetSetupDrawerHost({
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const host = useHostService();
  const pkg = usePackageStation(host.service?.id ?? 0);

  const closeRef  = useRef(onClose);       closeRef.current  = onClose;
  const footerRef = useRef(setFooter);     footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard); guardRef.current  = setCloseGuard;
  const savedRef  = useRef(onSaved);       savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading the Package Station…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state" role="alert">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;
  if (!pkg.detailLoaded)             return <div class="cz-station-drawer__state">Loading the Package Station…</div>;

  const rateSheet = pkg.service?.rate_sheet ?? null;
  const sheet = rateSheet
    ? { title: rateSheet.title, rowCount: rateSheet.items.length, groupCount: rateSheet.groups.length }
    : null;
  const eligibleRows = projectEligibleSetupRows(
    (pkg.service?.package_relationships ?? []).map((item) => ({
      item_id: item.item_id,
      label: relationshipDisplayLabel(item),
      missing: item.missing,
      source_service_title: item.source_service_title ?? null,
    })),
  );

  const initialise = async (title: string) => {
    const result = await pkg.initialiseRateSheet(title);
    return result.ok ? { ok: true as const } : { ok: false as const, message: result.message };
  };

  return <RateSheetSetupContent sheet={sheet} eligibleRows={eligibleRows} initialise={initialise} bridge={bridge} />;
}
