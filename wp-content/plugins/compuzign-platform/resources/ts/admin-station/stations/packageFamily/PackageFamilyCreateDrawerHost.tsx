// PackageFamilyCreateDrawerHost — the ADMIN STATION host adapter for Package
// Family creation.
//
// Creation names no existing record, so the dispatched recordId is not read
// here — the drawer's identity is the create surface itself. The creation
// authority is the same one the mature Command Centre create step used: the
// Package Family creation endpoint. This host only wires that command and the
// neutral bridge into the host-neutral create composition; the form, its
// validation, and the close-on-success behaviour live in entity-drawers.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import { createPackageFamily } from '@/api/endpoints/admin';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { PackageFamilyCreateContent } from '@/entity-drawers/package-family/PackageFamilyCreateContent';
import type { PackageFamilyCreateDraft } from '@/entity-drawers/package-family/PackageFamilyCreateContent';
import type { DrawerContentProps } from '../drawers/drawerTypes';

export function PackageFamilyCreateDrawerHost({
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
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

  const create = async (draft: PackageFamilyCreateDraft) => {
    try {
      await createPackageFamily({ name: draft.name, description: draft.description || undefined });
      return { ok: true as const };
    } catch (cause) {
      return {
        ok: false as const,
        message: cause instanceof Error ? cause.message : 'Could not save the Package Family.',
      };
    }
  };

  return <PackageFamilyCreateContent create={create} bridge={bridge} />;
}
