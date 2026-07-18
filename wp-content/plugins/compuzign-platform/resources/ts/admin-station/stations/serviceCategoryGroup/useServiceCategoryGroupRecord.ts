// Service Category Group record read — resolve one raw record by numeric id.
//
// The drawer opens with only a numeric recordId; its content needs the full
// ServiceCategoryGroupStationItem (the card projection dropped most fields). The
// list route projection is complete (there is no single-record GET — see
// useServiceCategoryGroupStation), so this resolves the record by finding it in
// the current-scope list. Identity is numeric throughout: the lookup is by
// `item.id === recordId`, never a stringified key.
//
// Bundle-safe: `useApi` + the shared endpoint only, same boundary as the card
// read.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminServiceCategoryGroups } from '@/api/endpoints/admin';
import type { ServiceCategoryGroupStationItem } from '@/api/types/admin';

export interface ServiceCategoryGroupRecordResult {
  record:  ServiceCategoryGroupStationItem | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useServiceCategoryGroupRecord(recordId: number): ServiceCategoryGroupRecordResult {
  const { data, loading, error, refetch } = useApi(() => fetchAdminServiceCategoryGroups());

  const record = useMemo(
    () => data?.category_groups.find((g) => g.id === recordId) ?? null,
    [data, recordId],
  );

  return { record, loading, error, refetch };
}
