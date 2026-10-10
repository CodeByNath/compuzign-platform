// Account Profile → card adapter.
//
// The pure projection from AccountDetail into the SAME entity-agnostic card
// contract (CategoryGroupCardItem) the Package Families wall already uses —
// Account's wall is a one-item collection through the identical kit, no new
// presentation code. Identity is the fixed native key: there is no numeric
// or string record id, so nothing is coerced to look like one.

import { ChevronRightIcon, AccountIcon } from '@/admin-station/shell/icons';
import { evaluateModule, accountBrandModule } from '@/drawer-kit/utils/moduleNotifications';
import type { CategoryGroupCardItem, CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type { AccountDetail } from '../types';

export function toAccountProfileCard(detail: AccountDetail): CategoryGroupCardItem {
  const module = evaluateModule(
    accountBrandModule,
    { bootstrapped: detail.bootstrapped },
    {
      platformStatus: detail.platform_status,
      platformLabel: 'Account Profile',
      moduleTransition: detail.module_status.brand,
      hasDraft: detail.drafts.brand !== null,
      disabled: detail.platform_status === 'disabled' && detail.previous_platform_status !== '',
    },
  );

  return {
    id: 'account-profile',
    key: 'account-profile',
    name: 'Account Profile',
    kind: 'Settings · Tools · Profile',
    description: detail.brand.name ? `Brand: ${detail.brand.name}` : 'Brand, Logo, and Favicon.',
    icon: AccountIcon,
    status: module.status as CategoryGroupStatus,
    notifications: module.notes,
    metrics: [],
    actions: [
      { id: 'view', label: 'View', icon: ChevronRightIcon },
    ],
  };
}
