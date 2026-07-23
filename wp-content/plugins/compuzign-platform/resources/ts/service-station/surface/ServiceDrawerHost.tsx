// ServiceDrawerHost — the ADMIN STATION host adapter for the Service drawer.
//
// The mirror image of the Command Centre's ServiceViewStep: a thin translator,
// not a second drawer. It reads the shell's DrawerContentProps handoff, resolves
// the record inputs the composition needs, maps those props onto the neutral
// EntityDrawerHostBridge, and mounts the SAME ServiceDrawerContent the old host
// mounts. Every module, status pill, notification panel, module footer, inline
// editor, save/cancel/dirty guard and lifecycle action comes from that shared
// composition — none of it is reimplemented here.
//
// Why this file can exist now: the drawer + schema renderer kit moved to the
// neutral `drawer-kit/`, and the composition to `entity-drawers/`, so mounting
// it no longer drags the Command Centre renderer tree across the bundle
// boundary. That was the blocker recorded in the Entity Drawer Recovery map.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import { useApi } from '@/hooks/useApi';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { ServiceDrawerContent } from '@/entity-drawers/service/ServiceDrawerContent';
import {
  normalizeAdminCategories,
  buildServiceItemForStationHandoff,
} from '@/entity-drawers/service/serviceSeed';
import { fetchAdminCatalog } from '@/service-station';
import type { DrawerContentProps } from '@/admin-station/stations/drawers/drawerTypes';

export function ServiceDrawerHost({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  // The drawer's own read, separate from the wall's — refreshing one cannot
  // disturb the other (the same two-instance rule the Package Family drawer keeps).
  const { data, loading, error } = useApi(() => fetchAdminCatalog());
  const { data: packagesData } = useSurfacePackages();

  // Resolve by the record's OWN native id. A Service id is numeric, so a foreign
  // id shape simply fails to match and the neutral state renders — nothing is
  // coerced to force a match.
  const summary = useMemo(
    () => (data?.stations ?? []).find((s) => s.id === recordId),
    [data, recordId],
  );

  const service       = useMemo(() => (summary ? buildServiceItemForStationHandoff(summary) : null), [summary]);
  const allCategories = useMemo(() => normalizeAdminCategories(data?.categories ?? []), [data]);
  const packages      = packagesData?.packages ?? [];

  // Stable bridge that always calls the latest host callbacks, so the
  // composition's guard/footer effects do not re-fire on unrelated host churn.
  // Same shape as the Command Centre adapter — that identical mapping is what
  // makes the seam real rather than nominal.
  const closeRef  = useRef(onClose);         closeRef.current  = onClose;
  const footerRef = useRef(setFooter);       footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard);   guardRef.current  = setCloseGuard;
  const savedRef  = useRef(onSaved);         savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    // The composition advances its own authoritative local record from mutation
    // responses. Refresh only the wall that opened it, avoiding a drawer flash.
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (loading && !data) return <div class="cz-station-drawer__state">Loading service…</div>;
  if (error)            return <div class="cz-station-drawer__state">{error}</div>;
  if (!service)         return <div class="cz-station-drawer__state">This service is no longer available.</div>;

  return (
    <ServiceDrawerContent
      service={service}
      packages={packages}
      allCategories={allCategories}
      // The shell's view/edit tab is the opening intent. 'edit' opens straight
      // into the Overview editor; the composition owns every other module's
      // edit state from there.
      initialTab="details"
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
