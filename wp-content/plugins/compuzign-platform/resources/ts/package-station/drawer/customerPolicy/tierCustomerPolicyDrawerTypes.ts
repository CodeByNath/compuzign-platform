// Neutral Customer Selection Rules drawer contracts.
//
// A sibling of `tier`, not a variant of it — see tierInclusionDrawerTypes.ts's
// own doc comment for the established shape this mirrors. This drawer opens
// the composable occupant's own customer_policy, a standalone controller over
// the ALREADY-PUBLISHED occupant, not a fifth module of the shared Tier
// drawer/entity (an earlier round wired it that way and the auditor rejected
// it as an architectural mismatch — see
// docs/code-map/tier-composable-occupant-admin-customer-policy.md).
//
// Identity: there is at most one composable occupant per Tier Instance, so
// the routing token carries only the instance id — no slot/occupant id is
// needed the way tier-inclusion's per-row address needs one.

import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface TierCustomerPolicyDrawerContentProps {
  // Service id is navigation context for the Package-owned endpoint.
  serviceId: number;
  // Capability-instance identity, independent of slot/occupant identity.
  tierInstanceId: string;
  // Opening intent carried from the card action that dispatched the drawer.
  initialEdit?: boolean;
  // The host seam.
  bridge: EntityDrawerHostBridge;
}

const TIER_CUSTOMER_POLICY_DRAWER_RECORD_PREFIX = 'tier-customer-policy:';

export interface TierCustomerPolicyDrawerTarget {
  instanceId: string;
}

/** Package-owned routing token. */
export function encodeTierCustomerPolicyDrawerRecordId(instanceId: string): string {
  return `${TIER_CUSTOMER_POLICY_DRAWER_RECORD_PREFIX}${instanceId}`;
}

export function decodeTierCustomerPolicyDrawerRecordId(recordId: string): TierCustomerPolicyDrawerTarget | null {
  if (!recordId.startsWith(TIER_CUSTOMER_POLICY_DRAWER_RECORD_PREFIX)) return null;
  const instanceId = recordId.slice(TIER_CUSTOMER_POLICY_DRAWER_RECORD_PREFIX.length);
  return instanceId ? { instanceId } : null;
}
