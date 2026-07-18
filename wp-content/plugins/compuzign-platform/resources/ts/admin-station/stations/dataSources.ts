// Data source registry — dataSourceKey → the read hook that supplies a surface.
//
// The binding table names a source by key; this registry is where that key
// resolves to a real read. Each source is a hook returning the collection state
// the template kits consume. The item type is deliberately widened to `unknown`
// at this registry seam: a binding pairs a source with a kit that knows the
// concrete shape, and the kit narrows it. That one documented widening is the
// price of a declarative, string-keyed registry — it keeps the shell generic.
//
// Every source here is a pure read hook (fetch + map), so nothing from the old
// admin UI tree is pulled in by registering it.

import { usePackageFamilyCards } from './packageFamily';
import { useServiceCategoryCards } from './serviceCategory/useServiceCategoryCards';
import type { DataSourceKey } from './surfaceBindings';

// The collection contract every data source returns and every template kit
// consumes. Matches the card grid's existing loading / error / items props.
export interface SurfaceCollection<Item = unknown> {
  items:   Item[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

// A data source is a hook. It must obey the Rules of Hooks at its call site:
// StationSurfaceHost calls exactly one, and remounts when the key changes, so a
// resolved source is stable for the life of a mount.
export type StationDataSource = () => SurfaceCollection;

// Registered reads. A source stays registered whether or not a binding currently
// names it — that is what makes re-pointing a surface a one-word change in the
// binding table rather than a code move.
export const DATA_SOURCES: Record<DataSourceKey, StationDataSource> = {
  'package-families': usePackageFamilyCards,
  'service-categories': useServiceCategoryCards,
};
