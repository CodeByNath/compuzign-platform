// Data-source registry — source key to the hook supplying a surface collection.

export interface SurfaceCollection<Item = unknown> {
  items: Item[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export type StationDataSource = () => SurfaceCollection;

const registeredDataSources = new Map<string, StationDataSource>();

let locked = false;
let resolversReady = false;
let dataSourceIndex = new Map<string, StationDataSource>();

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] data-source registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

export function registerDataSources(record: Record<string, StationDataSource>): void {
  assertRegistrationOpen();

  const entries = Object.entries(record);
  for (const [key] of entries) {
    if (registeredDataSources.has(key)) {
      throw new Error(`[StationManager] duplicate data-source key '${key}'.`);
    }
  }

  for (const [key, source] of entries) {
    registeredDataSources.set(key, source);
  }
}

export function resolveDataSource(key: string): StationDataSource {
  assertResolversReady();
  const source = dataSourceIndex.get(key);
  if (!source) {
    throw new Error(`[StationManager] unknown data source '${key}'.`);
  }
  return source;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeDataSourceRegistry(): void {
  locked = true;
  dataSourceIndex = new Map(registeredDataSources);
}

/** @internal Used by boot assertions before public resolvers are enabled. */
export function _hasRegisteredDataSource(key: string): boolean {
  return dataSourceIndex.has(key);
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableDataSourceResolvers(): void {
  resolversReady = true;
}
