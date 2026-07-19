// Command Centre host adapter for the neutral Category drawer composition.
// Category modules, editors, lifecycle, footer, dialogs, and close guard live in
// entity-drawers/category; this file only translates the ActionShell handoff.

import { useMemo, useRef } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category } from '@/api/types/cost-builder';
import type { CategoryStationItem, SurfacePackageSummary } from '@/api/types/admin';
import type { ServiceSummary } from '@/admin-station/stations/service';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { CategoryDrawerContent } from '@/entity-drawers/category/CategoryDrawerContent';

// ===========================================================================
// SECTION: CATEGORY_DRAWER_MODEL
// ===========================================================================

export interface CategoryDrawerDeps {
  getCatalogData: () => {
    stations: ServiceSummary[];
    packages: SurfacePackageSummary[];
    categories: Category[];
  };
  onRefresh?: () => void;
  openAction: (config: ActionConfig) => void;
}

export function buildCategoryViewConfig(
  category: CategoryStationItem,
  deps: CategoryDrawerDeps,
  initialTab: DrawerTabId = 'details',
): ActionConfig {
  return {
    id: `category-view-${category.id}`,
    mode: 'drawer',
    title: 'Category',
    initialStepData: { category, deps, initialTab },
    steps: [{ id: 'detail', title: 'Category Detail', component: CategoryViewStep }],
  };
}

function assignedFor(category: CategoryStationItem, deps: CategoryDrawerDeps): ServiceSummary[] {
  return deps.getCatalogData().stations.filter(
    (service) => service.categories.some((assigned) => assigned.id === category.id),
  );
}

// ===========================================================================
// SECTION: CATEGORY_DRAWER_HOST
// ===========================================================================

export function CategoryViewStep({ ctx }: { ctx: StepContext }) {
  const category = ctx.stepData.category as CategoryStationItem;
  const deps = ctx.stepData.deps as CategoryDrawerDeps;
  const initialTab = ctx.stepData.initialTab as DrawerTabId | undefined;
  const initialEdit = ctx.stepData.initialEdit as boolean | undefined;
  const assignedServices = useMemo(() => assignedFor(category, deps), [category.id, deps]);

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const refreshRef = useRef(deps.onRefresh);
  refreshRef.current = deps.onRefresh;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close: () => ctxRef.current.close(),
    setFooter: (footer) => ctxRef.current.setFooter(footer),
    setCloseGuard: (guard) => ctxRef.current.setCloseGuard(guard),
    onMutationComplete: () => refreshRef.current?.(),
  }), []);

  return (
    <CategoryDrawerContent
      category={category}
      assignedServices={assignedServices}
      initialTab={initialTab}
      initialEdit={initialEdit}
      bridge={bridge}
    />
  );
}

/*
 * FILE INDEX
 *
 * CATEGORY_DRAWER_MODEL  ActionShell handoff contract and config builder
 * CATEGORY_DRAWER_HOST   Thin StepContext → EntityDrawerHostBridge adapter
 */
