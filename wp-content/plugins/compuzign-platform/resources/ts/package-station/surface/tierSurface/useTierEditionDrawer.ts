// The scoped Tier Edition drawer's own read/edit scope — composes readers
// Package Station already owns and adds NO third:
//
//   useHostService()    — the Package Station's host Service, the same
//                         resolution TierDrawerHost.tsx already uses.
//   usePackageStation() — the addressed Tier instance/occupant, the same
//                         authoritative read every other Tier surface uses.
//   useTierEditions()   — the Edition lifecycle actions, the same hook
//                         TierEditionsPanel already uses inline.
//
// Resolution fails closed: the occupant is addressed by its stored slotId,
// the Edition by its stored id, never by title/position, and if the
// addressed occupant no longer owns the addressed Edition the drawer
// reports the connection as gone rather than showing another Edition.

import { usePackageStation } from '../../usePackageStation';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEdition } from '../../types';
import { useHostService } from './useHostService';
import { useTierEditions } from './useTierEditions';
import type { TierEditionsController } from './useTierEditions';
import { selectableRateSheets } from '../tierInstance/tierInstanceModel';

export interface TierEditionDrawerState {
  loading:     boolean;
  /** A terminal state to render instead of the scope: load failure, or a connection that no longer exists. */
  unavailable: string | null;
  serviceId:   number;
  edition:     TierEdition | null;
  defaultEditionId: string | null;
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] } | null;
  ctl: TierEditionsController;
}

export function useTierEditionDrawer(
  instanceId: string,
  slotId: string,
  editionId: string,
  onMutationComplete: () => void,
): TierEditionDrawerState {
  const host = useHostService();
  const serviceId = host.service?.id ?? 0;
  const pkg = usePackageStation(serviceId, instanceId, onMutationComplete);

  const view = pkg.tierView(slotId);
  const detail = view?.detail ?? null;
  const editions = detail?.tier_editions ?? [];
  const defaultEditionId = detail?.default_edition_id ?? null;

  const ctl = useTierEditions(serviceId, instanceId, slotId, editions, defaultEditionId, onMutationComplete);
  const edition = ctl.editions.find((candidate) => candidate.id === editionId) ?? null;

  const stationLoading = host.service !== null && !pkg.detailLoaded;
  const stillLoading = host.loading || stationLoading;

  let unavailable: string | null = null;
  if (!stillLoading) {
    if (host.error) unavailable = host.error;
    else if (host.service === null) unavailable = 'The Package Station needs a host Service before its Editions can be read.';
    else if (detail === null || detail.occupant_id === null) unavailable = 'This Tier slot no longer has an occupant.';
    else if (edition === null) unavailable = 'This Tier occupant no longer has this Edition.';
  }

  const rateSheetOptions: AdminFieldOption[] = pkg.service && detail
    ? selectableRateSheets(
        pkg.service.rate_sheets,
        pkg.station?.allowed_rate_sheet_ids ?? [],
        edition?.rate_sheet_id ?? null,
      ).map((sheet) => ({
        value: sheet.rate_sheet_id,
        label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
      }))
    : [];

  return {
    loading: stillLoading,
    unavailable,
    serviceId,
    edition,
    defaultEditionId,
    rateSheetOptions,
    svc: pkg.service,
    ctl,
  };
}
