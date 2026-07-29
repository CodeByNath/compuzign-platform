// Neutral Service drawer contracts.
//
// The Service drawer composition is host-agnostic: it receives the record inputs
// its authoritative hook (useServiceStation) needs plus an EntityDrawerHostBridge,
// and reports host concerns through the bridge. It imports neither the Command
// Centre host nor the Admin Station shell, so both mount the same composition
// through a thin adapter.

import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/package-station';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

// The record inputs the Service drawer needs. These mirror exactly what the old
// host handed the step through stepData: a seed ServiceItem (the hook fetches the
// authoritative detail from `service.id`), the package summaries, and the
// category list for the overview editor. The Admin Station adapter resolves the
// same three from a numeric recordId before mounting the composition.
//
// `service: null` addresses no stored post yet — the Settings lane's Create
// Service launcher opens this SAME composition against the stable `'new'`
// recordId sentinel. No fake numeric id stands in for it anywhere: the
// pending Overview draft lives in useServiceStation's own local state, and
// `service` only becomes non-null once the footer's Publish creates the real
// record (mirrors Package Family's `'new'` sentinel, without widening
// ServiceItem.id to carry it).
export interface ServiceDrawerContentProps {
  service:       ServiceItem | null;
  packages:      SurfacePackageSummary[];
  allCategories: Category[];
  // Opening intent, carried from the surface that dispatched the drawer.
  initialTab?:  DrawerTabId;      // 'details' | 'connections'
  initialEdit?: boolean;          // open straight into the Overview editor
  // The host seam — footer, close-guard, close, and post-mutation refresh.
  bridge: EntityDrawerHostBridge;
}

// Which module editor is open (null = every module readable — the module-level
// edit model). Named here because the controller, footer, and dialogs all read it.
export type ServiceEditingSection = 'overview' | 'inclusions' | 'faqs' | null;

// Which exit dialog the close-guard has raised, if any.
export type ServiceExitDialog = 'unsaved' | 'pending' | 'new-service-draft' | null;
