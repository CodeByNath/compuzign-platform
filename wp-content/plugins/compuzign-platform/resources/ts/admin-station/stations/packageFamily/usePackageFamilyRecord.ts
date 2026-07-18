// Package Family record read — resolve one raw record by its group_id.
//
// The drawer opens with only a recordId; its content needs the full
// PackageFamilyItem (the card projection kept only the face fields, dropping the
// dependents breakdown the drawer's connections section shows). There is no
// single-record GET on this route, so the record is resolved from the
// current-scope list projection, which is complete.
//
// Identity: the drawer's id arrives as the shell's StationRecordId (either
// native form), and this station matches it against its OWN native field —
// `item.group_id === recordId`, a string. No parse, no coercion: an id of
// another entity's shape simply does not match, and the content renders its
// neutral "not available" state rather than resolving a wrong record.
//
// Bundle-safe: `useApi` + the shared endpoint only, same boundary as the card
// read.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchPackageFamilies } from '@/api/endpoints/admin';
import type { PackageFamilyItem } from '@/api/types/admin';
import type { StationRecordId } from '../recordIdentity';

export interface PackageFamilyRecordResult {
  record:  PackageFamilyItem | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function usePackageFamilyRecord(recordId: StationRecordId): PackageFamilyRecordResult {
  const { data, loading, error, refetch } = useApi(() => fetchPackageFamilies());

  const record = useMemo(
    () => data?.package_category_groups.find((g) => g.group_id === recordId) ?? null,
    [data, recordId],
  );

  return { record, loading, error, refetch };
}
