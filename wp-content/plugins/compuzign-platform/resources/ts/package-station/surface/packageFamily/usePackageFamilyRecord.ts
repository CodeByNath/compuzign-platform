// Package Family record read — resolve one raw record by its group_id.
//
// The drawer opens with only a recordId; its content needs the full
// PackageFamilyItem (the card projection kept only the face fields, dropping the
// dependents breakdown the drawer's connections section shows). There is no
// single-record GET on this route, so the record is resolved from the
// list projections. Current scope is combined with archived/trashed scope so
// the composition can also render its authoritative restore/delete footer when
// reached from a future binned surface.
//
// Identity: the drawer's id arrives as the shell's StationRecordId (either
// native form), and this station matches it against its OWN native field —
// `item.group_id === recordId`, a string. No parse, no coercion: an id of
// another entity's shape simply does not match, and the content renders its
// neutral "not available" state rather than resolving a wrong record.
//
// Bundle-safe: `useApi` + the shared endpoint only, same boundary as the card
// read.
//
// The stable `'new'` sentinel addresses no stored record: it resolves to a
// local, empty PackageFamilyItem (group_id: '') instead of reading the list,
// so the mature drawer opens on its ordinary Overview module with nothing to
// fetch. `usePackageFamilyStation`/`usePackageFamilyDrawerController` treat an
// empty `group_id` as "not yet created" and route its Save/Publish accordingly.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchPackageFamilies } from '../../api';
import type { PackageFamilyItem } from '../../types';
import type { StationRecordId } from '@/station-manager/recordIdentity';

export interface PackageFamilyRecordResult {
  record:  PackageFamilyItem | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export const NEW_PACKAGE_FAMILY_SEED: PackageFamilyItem = {
  group_id:                 '',
  platform_id:              '',
  label:                    '',
  description:              '',
  platform_status:          'disabled',
  previous_platform_status: null,
  module_status:            { overview: 'not-configured' },
  has_draft:                false,
  sort_order:               0,
  assigned_service_count:   0,
  dependents:               { services: 0, rate_sheet_rows: 0, tier_selections: 0 },
};

export function usePackageFamilyRecord(recordId: StationRecordId): PackageFamilyRecordResult {
  const isNew = recordId === 'new';
  const { data, loading, error, refetch } = useApi(async () => {
    const [current, archived, trashed] = await Promise.all([
      fetchPackageFamilies(),
      fetchPackageFamilies('archived'),
      fetchPackageFamilies('trashed'),
    ]);
    return [
      ...current.package_category_groups,
      ...archived.package_category_groups,
      ...trashed.package_category_groups,
    ];
  });

  const record = useMemo(() => {
    if (isNew) return NEW_PACKAGE_FAMILY_SEED;
    return data?.find((group) => group.group_id === recordId) ?? null;
  }, [data, recordId, isNew]);

  return {
    record,
    loading: isNew ? false : loading,
    error:   isNew ? null : error,
    refetch,
  };
}
