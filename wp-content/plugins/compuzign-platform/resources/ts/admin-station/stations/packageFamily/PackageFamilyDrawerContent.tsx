// Admin Station host adapter for the mature, neutral Package Family drawer.
// The string group_id is resolved without coercion; presentation, editing,
// lifecycle, footer, notifications, and close guards live in entity-drawers.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { PackageFamilyDrawerContent as SharedPackageFamilyDrawerContent } from '@/entity-drawers/package-family/PackageFamilyDrawerContent';
import type { DrawerContentProps } from '../drawers/drawerTypes';
import { usePackageFamilyRecord } from './usePackageFamilyRecord';

export function PackageFamilyDrawerContent({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const { record, loading, error } = usePackageFamilyRecord(recordId);

  const closeRef = useRef(onClose); closeRef.current = onClose;
  const footerRef = useRef(setFooter); footerRef.current = setFooter;
  const guardRef = useRef(setCloseGuard); guardRef.current = setCloseGuard;
  const savedRef = useRef(onSaved); savedRef.current = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close: () => closeRef.current(),
    setFooter: (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard) => guardRef.current?.(guard),
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (loading) return <div class="cz-station-drawer__state">Loading Package Family…</div>;
  if (error) return <div class="cz-station-drawer__state" role="alert">{error}</div>;
  if (!record) return <div class="cz-station-drawer__state">This Package Family is no longer available.</div>;

  return (
    <SharedPackageFamilyDrawerContent
      family={record}
      initialTab="details"
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
