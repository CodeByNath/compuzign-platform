// RateSheetGroupCreateDrawerHost — the ADMIN STATION host adapter for adding a
// Rate Sheet group to the station's one Rate Sheet.
//
// Creation names no existing record, so the dispatched recordId is not read
// here. The host resolves the active Package Station context, mounts the
// authoritative Package Station hook, and passes its createRateSheetGroup
// command into the neutral composition. The command requires a configured
// sheet; without one it fails honestly rather than inventing a sheet.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { usePackageStation } from '@/hooks/usePackageStation';
import { RateSheetGroupCreateContent } from '@/entity-drawers/rate-sheet/RateSheetGroupCreateContent';
import { useHostService } from '../tierSurface/useHostService';
import type { DrawerContentProps } from '../drawers/drawerTypes';

export function RateSheetGroupCreateDrawerHost({
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

  const create = async (label: string) => {
    const result = await pkg.createRateSheetGroup(label);
    return result.ok ? { ok: true as const } : { ok: false as const, message: result.message };
  };

  return <RateSheetGroupCreateContent create={create} bridge={bridge} />;
}
