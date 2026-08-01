// Service Home Connections — the authoritative Category projection for the
// lower deck's Connections lane.
//
// Reuses the SAME authoritative Category list endpoint (`fetchAdminCategories`)
// rather than deriving categories or counts from the Service catalogue
// projection (which carries only { id, name, slug } per Service and no
// connected-count, status, or icon). No second Category data source, no
// second relationship model.
//
// `fetchAdminCategories()` with no status filter already excludes archived and
// trashed Categories (StationLifecycle::isBinned) and already excludes Service
// Category Group terms (station_role !== 'category'), and already returns
// `assigned_count` server-computed. This module's only job is: keep only
// Categories connected to at least one Service (assigned_count > 0), and shape
// the rest into row data — the "connected to the full Service Catalogue" scope
// the Connections lane presents.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { fetchAdminCategories } from '@/api/endpoints/admin';
import type { CategoryStationItem } from '@/api/types/admin';

export interface ServiceHomeConnectionRow {
  id:               number;
  name:             string;
  connectedCount:   number;
  status:           CategoryStationItem['platform_status'];
}

function toConnectionRow(category: CategoryStationItem): ServiceHomeConnectionRow {
  return {
    id:             category.id,
    name:           category.name,
    connectedCount: category.assigned_count,
    status:         category.platform_status,
  };
}

// Connections shows Categories connected to at least one Service — not every
// registered Category. An unused Category belongs in Settings/management, not
// in a lane naming the Service Catalogue's existing relationships.
export function projectServiceHomeConnectionRows(categories: CategoryStationItem[]): ServiceHomeConnectionRow[] {
  return categories
    .filter((category) => category.assigned_count > 0)
    .map(toConnectionRow);
}

export interface ServiceHomeConnectionsState {
  rows:            ServiceHomeConnectionRow[];
  initialLoading:  boolean;
  refreshing:      boolean;
  error:           string | null;
  refetch:         () => void;
}

// Deliberately not built on the generic `useApi` — that hook resets to
// `loading: true` / `data: null` on every refetch, which is the exact
// "any fetch in flight" shape that caused the Tier System footer-loop defect
// (a background refresh briefly unmounting the composition it fed). This hook
// tracks "has ever loaded" instead, so a refetch only ever flips `refreshing`
// and never discards the settled `rows` a render is already showing.
export function useServiceHomeConnections(): ServiceHomeConnectionsState {
  const [rows, setRows] = useState<ServiceHomeConnectionRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const load = useCallback(() => {
    if (initializedRef.current) setRefreshing(true);
    setError(null);
    fetchAdminCategories()
      .then((response) => {
        initializedRef.current = true;
        setRows(projectServiceHomeConnectionRows(response.categories));
      })
      .catch((err: unknown) => {
        initializedRef.current = true;
        setError(err instanceof Error ? err.message : 'Could not load Category connections.');
      })
      .finally(() => {
        setInitialLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, initialLoading, refreshing, error, refetch: load };
}
