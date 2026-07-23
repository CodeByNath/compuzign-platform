// Station Manager boot boundary — lock registration, build indexes, assert the
// completed graph, then make every public resolver available to mounted UI.

import {
  _enableNavigationResolvers,
  _finalizeNavigationRegistry,
  type StationNavItem,
} from './navigation';
import {
  _enableDestinationResolvers,
  _finalizeDestinationRegistry,
  _hasRegisteredDestination,
} from './destinations';
import {
  _enableSurfaceBindingResolvers,
  _finalizeSurfaceBindingRegistry,
  type AdminStationSurfaceBinding,
} from './surfaceBindings';
import {
  _enableDataSourceResolvers,
  _finalizeDataSourceRegistry,
  _hasRegisteredDataSource,
} from './dataSources';
import {
  _enableTemplateKitResolvers,
  _finalizeTemplateKitRegistry,
  _hasRegisteredTemplateKit,
} from './templateKits';
import {
  _enableDrawerTemplateResolvers,
  _finalizeDrawerTemplateRegistry,
} from './drawerTemplates';

let finalizationStarted = false;

// Resolvability guard — moved from StationSurfaceHost. A binding that names a
// data source or template kit the registries do not define is a static authoring
// error that would otherwise render nothing at runtime.
function assertBindingsResolvable(list: AdminStationSurfaceBinding[]): void {
  const problems: string[] = [];
  for (const b of list) {
    const at = `${b.stationId}::${b.surfaceId}::${b.placement}`;
    if (!_hasRegisteredDataSource(b.dataSourceKey)) {
      problems.push(`${at} → unknown data source '${b.dataSourceKey}'`);
    }
    if (!_hasRegisteredTemplateKit(b.templateKitKey)) {
      problems.push(`${at} → unknown template kit '${b.templateKitKey}'`);
    }
  }
  if (problems.length) {
    throw new Error(
      `[AdminStation] surface binding(s) do not resolve: ${problems.join('; ')}.`,
    );
  }
}

function assertNavigationDestinationsResolvable(items: StationNavItem[]): void {
  const problems = items
    .filter((item) => !_hasRegisteredDestination(item.activationKey))
    .map(
      (item) =>
        `navigation '${item.id}' → unknown destination '${item.activationKey}'`,
    );

  if (problems.length) {
    throw new Error(
      `[StationManager] navigation item(s) do not resolve: ${problems.join('; ')}.`,
    );
  }
}

export function finalizeStationRegistry(): void {
  if (finalizationStarted) {
    throw new Error('[StationManager] station registry has already been finalized.');
  }
  finalizationStarted = true;

  const navItems = _finalizeNavigationRegistry();
  _finalizeDestinationRegistry();
  const bindings = _finalizeSurfaceBindingRegistry();
  _finalizeDataSourceRegistry();
  _finalizeTemplateKitRegistry();
  _finalizeDrawerTemplateRegistry();

  assertBindingsResolvable(bindings);
  assertNavigationDestinationsResolvable(navItems);

  _enableNavigationResolvers();
  _enableDestinationResolvers();
  _enableSurfaceBindingResolvers();
  _enableDataSourceResolvers();
  _enableTemplateKitResolvers();
  _enableDrawerTemplateResolvers();
}
