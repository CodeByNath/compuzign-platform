// Package Family cards — the read boundary.
//
// The one place the Admin Station fetches Package Families for a presentation
// region. It reads the current-scope list route, maps each record through the
// pure card adapter, and returns the collection state every template kit
// consumes ({ items, loading, error, refetch }).
//
// Registering this source is the entire cost of putting a second entity on the
// card wall: one read hook plus one pure adapter. No card, kit, host, or shell
// code knows it exists.
//
// Bundle boundary: `useApi` and `fetchPackageFamilies` are both pure
// data/transport (the endpoints module value-imports only apiClient), so nothing
// from the old admin UI tree crosses into the Admin Station bundle — notably NOT
// the old PackageFamiliesSection / PackageFamilyCards renderers, which own the
// same data in the legacy tree. The backend row type is type-only.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchPackageFamilies } from '@/package-station';
import { toPackageFamilyCard } from './cardAdapter';
import { useRetainedCollection } from '../useRetainedCollection';
import type { CategoryGroupCardItem } from '../../presentation/category-groups/types';

export interface PackageFamilyCardsResult {
  items:   CategoryGroupCardItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

/**
 * Read the current Package Families as cards.
 *
 * No argument: the list route defaults to the current scope (active/disabled) —
 * archived and trashed belong to the body/archive surfaces, not the presentation
 * wall. The mapping is memoised on the raw response so re-renders don't rebuild
 * the card array.
 *
 * `refetch` is the handle this wall hands to the drawer it opens, so a saved
 * family refreshes THIS wall. The collection is retained across that reload, so
 * the cards update in place instead of blanking (see useRetainedCollection).
 */
export function usePackageFamilyCards(): PackageFamilyCardsResult {
  const { data, loading, error, refetch } = useApi(() => fetchPackageFamilies());

  const projected = useMemo(
    () => (data?.package_category_groups ?? []).map(toPackageFamilyCard),
    [data],
  );

  const retained = useRetainedCollection(projected, loading);

  return { items: retained.items, loading: retained.loading, error, refetch };
}
