// Neutral Tier drawer contracts.
//
// Like the Service drawer, the Tier drawer composition is host-agnostic: it
// receives the record inputs usePackageStation needs plus an
// EntityDrawerHostBridge, and imports neither host. The Command Centre and Admin
// Station adapters resolve these inputs from their respective routing state.

import type { ServiceItem } from '@/api/types/cost-builder';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface TierDrawerContentProps {
  // The package station is addressed by its parent service id (numeric).
  serviceId: number;
  // Richer parent service (more than the station stub) for the Connections tab.
  service?: ServiceItem;
  // Return-to-Service navigation, wired to the service-overview connection View.
  serviceBack?: () => void;
  // Context-aware header Back handle: the composition points it at
  // "back to package overview" while a tier is open, and clears it otherwise, so
  // the host's single header Back can fall through to the Service drawer. Old
  // host passes its ref; a host without a shared header Back omits it.
  tierBack?: { current: (() => void) | null };
  // Opening intent carried from the card that dispatched the drawer.
  initialTierId?:      string;
  initialOccupantId?:  string;
  initialTierSection?: 'tier-overview';
  // The host seam.
  bridge: EntityDrawerHostBridge;
}

// Which individual-tier module is being edited (null = every module readable).
export type TierEditingSection = 'tier-overview' | 'tier-inclusions' | 'tier-faqs' | null;

// A binned-occupant restore conflict, keyed by the engine's D3 error codes.
export interface TierBinPrompt {
  binId:       string;
  code:        'target_occupied' | 'origin_unknown' | 'pending_drafts';
  mode?:       'swap' | 'retarget';
  targetTier?: string;
}
