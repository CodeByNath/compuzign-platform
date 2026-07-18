// Neutral Service drawer contracts.
//
// The Service drawer composition is host-agnostic: it receives the record inputs
// its authoritative hook (useServiceStation) needs plus an EntityDrawerHostBridge,
// and reports host concerns through the bridge. It imports neither host — not the
// old StepContext/ActionShell, not the Admin Station shell — so both hosts mount
// the same composition through a thin adapter.

import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/api/types/admin';
import type { DrawerTabId } from '../../DrawerTabs';
import type { EntityDrawerHostBridge } from '../entityDrawerHost';

// The record inputs the Service drawer needs. These mirror exactly what the old
// host handed the step through stepData: a seed ServiceItem (the hook fetches the
// authoritative detail from `service.id`), the package summaries, and the
// category list for the overview editor. A future Admin Station adapter resolves
// the same three from a numeric recordId before mounting the composition.
export interface ServiceDrawerContentProps {
  service:       ServiceItem;
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
