// Admin Station host adapter for the neutral Category drawer composition.
// Numeric Category identity is resolved without coercion, then the same
// CategoryDrawerContent mounted by Command Centre receives a neutral bridge.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import { fetchAdminCategories } from '@/api/endpoints/admin';
import { useApi } from '@/hooks/useApi';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { CategoryDrawerContent } from '@/entity-drawers/category/CategoryDrawerContent';
import { fetchAdminCatalog } from '@/service-station';
import type { DrawerContentProps } from '../drawers/drawerTypes';

export function CategoryDrawerHost({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const categoriesApi = useApi(() => fetchAdminCategories());
  const catalogApi = useApi(() => fetchAdminCatalog());

  const category = useMemo(
    () => categoriesApi.data?.categories.find((item) => item.id === recordId) ?? null,
    [categoriesApi.data, recordId],
  );

  const assignedServices = useMemo(
    () => category
      ? (catalogApi.data?.stations ?? []).filter(
          (service) => service.categories.some((assigned) => assigned.id === category.id),
        )
      : [],
    [catalogApi.data, category],
  );

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

  if ((categoriesApi.loading && !categoriesApi.data) || (catalogApi.loading && !catalogApi.data)) {
    return <div class="cz-station-drawer__state">Loading Category…</div>;
  }
  if (categoriesApi.error || catalogApi.error) {
    return <div class="cz-station-drawer__state" role="alert">{categoriesApi.error ?? catalogApi.error}</div>;
  }
  if (!category) {
    return <div class="cz-station-drawer__state">This Category is no longer available.</div>;
  }

  return (
    <CategoryDrawerContent
      category={category}
      assignedServices={assignedServices}
      initialTab="details"
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
