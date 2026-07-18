// Service Category Group record read — resolve one raw record by its term_id.
//
// The drawer opens with only a recordId; its content needs the full
// ServiceCategoryGroupStationItem (the card projection dropped most fields). The
// list route projection is complete (there is no single-record GET — see
// useServiceCategoryGroupStation), so this resolves the record by finding it in
// the current-scope list.
//
// Identity: the drawer's id arrives as the shell's StationRecordId (either
// native form), and this station matches it against its OWN native field —
// `item.id === recordId`, a numeric term_id. No parse, no stringify, no coercion:
// an id of another entity's shape simply does not match, and the drawer content
// renders its neutral "not available" state rather than resolving a wrong record.
//
// Bundle-safe: `useApi` + the shared endpoint only, same boundary as the card
// read.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminServiceCategoryGroups } from '@/api/endpoints/admin';
import type { ServiceCategoryGroupStationItem } from '@/api/types/admin';
import type { StationRecordId } from '../recordIdentity';

export interface ServiceCategoryGroupRecordResult {
  record:  ServiceCategoryGroupStationItem | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useServiceCategoryGroupRecord(recordId: StationRecordId): ServiceCategoryGroupRecordResult {
  const { data, loading, error, refetch } = useApi(() => fetchAdminServiceCategoryGroups());

  const record = useMemo(
    () => data?.category_groups.find((g) => g.id === recordId) ?? null,
    [data, recordId],
  );

  return { record, loading, error, refetch };
}
