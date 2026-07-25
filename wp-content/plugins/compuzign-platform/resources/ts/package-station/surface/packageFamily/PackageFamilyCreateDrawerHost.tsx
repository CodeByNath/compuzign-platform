import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import {
  createPackageFamily,
  createTierAssignment,
  createTierInstance,
} from '../../api';
import { PackageFamilyCreateContent } from '../../drawer/package-family/PackageFamilyCreateContent';

export function PackageFamilyCreateDrawerHost({
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
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

  const commands = useMemo(() => ({
    createFamily: createPackageFamily,
    createTierInstance,
    createTierAssignment,
  }), []);

  return <PackageFamilyCreateContent commands={commands} bridge={bridge} />;
}
