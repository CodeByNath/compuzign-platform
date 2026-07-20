// Package Station Tools / Skills catalogue — the read boundary.
//
// The one place the Station projects the tool REGISTRY (station-wide, not
// Family-scoped) into a presentation collection. It reads the current Package
// Family list once — the same route the Families wall reads — and, for each
// registry tool, counts the Families that have it enabled. It performs NO
// mutation: assignment stays owned by the Family and is edited from the Family
// drawer's Settings. This source only reads and projects.
//
// Bundle boundary: `useApi` + `fetchPackageFamilies` are pure data/transport, and
// the tool registry is pure metadata, so registering this source pulls nothing
// from the legacy admin UI tree.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchPackageFamilies } from '@/api/endpoints/admin';
import { PACKAGE_TOOLS, countFamiliesWithTool } from '@/modules/packages/packageTools';
import { useRetainedCollection } from '../useRetainedCollection';
import type { PackageToolCatalogueItem } from '../../presentation/package-tools/types';

export interface PackageToolCatalogueResult {
  items:   PackageToolCatalogueItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

/**
 * Read the Station tool catalogue with per-tool Family-assignment counts.
 *
 * The registry order is authoritative — Tier (the one real tool) first, futures
 * after. The count is derived from the current-scope Family list; an unavailable
 * tool is always 0 because it can never be enabled. The projection is memoised on
 * the raw response so re-renders don't rebuild the catalogue array.
 */
export function usePackageToolCatalogue(): PackageToolCatalogueResult {
  const { data, loading, error, refetch } = useApi(() => fetchPackageFamilies());

  const projected = useMemo<PackageToolCatalogueItem[]>(() => {
    const families = data?.package_category_groups ?? [];
    return PACKAGE_TOOLS.map((tool) => ({
      key: tool.key,
      label: tool.label,
      description: tool.description,
      available: tool.available,
      authority: tool.authority,
      assignedFamilyCount: tool.available ? countFamiliesWithTool(families, tool.key) : 0,
      unavailableReason: tool.unavailableReason,
    }));
  }, [data]);

  const retained = useRetainedCollection(projected, loading);

  return { items: retained.items, loading: retained.loading, error, refetch };
}
