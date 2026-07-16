// Temporary mock Category Group data.
//
// Stands in for the future Category Station read, and is shaped as that read's
// result so the swap is a data change and not a UI change. Deliberately neutral:
// no real Category Group is named here, and no real station is connected.
//
// This module is the whole data boundary. The grid receives items and callbacks
// and never reaches for this file, so replacing it with the Category Station's
// read touches nothing in the card tree.
//
// Three records for development preview — enough to inspect the loop and the
// desktop three-across grid. The count is data, not structure: the grid renders
// any number, and nothing below is a fixed-count assumption. They differ only in
// their values; each varies status so all three pill states are inspectable.
//
// Neutral by construction — no real Category Group (KAIROS, APTOS, OMNIA) is
// named, and nothing keys off these names: every dispatch travels by id/key.
//
// "Archive card" here means a card drawn from the Category Group archive/list
// collection. It is NOT an archived lifecycle status.

import type { CategoryGroupCardItem } from './types';
import { ServicesIcon, PackagesIcon, PromotionsIcon, ViewIcon } from '../../shell/icons';

export const mockCategoryGroupCards: CategoryGroupCardItem[] = [
  {
    id: 'sample-group-alpha',
    key: 'sample-group-alpha',
    name: 'Sample Group Alpha',
    code: 'ALPHA',
    status: 'active',
    description:
      'Neutral sample record. The Category Station will supply the real group, its counts, and its available actions.',
    icon: ServicesIcon,
    // Loop-rendered by the card. Tiers is deliberately not a Category Group
    // metric. Labels here are data — the card structure does not know them.
    metrics: [
      { id: 'services', label: 'Services', value: 12 },
      { id: 'inclusions', label: 'Inclusions', value: 38 },
      { id: 'packages', label: 'Packages', value: 5 },
    ],
    // actions[0] is the split control's primary. No destructive action is
    // supplied, so none is enabled — Delete arrives with real data.
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
      { id: 'archive', label: 'Archive' },
    ],
  },
  {
    id: 'sample-group-beta',
    key: 'sample-group-beta',
    name: 'Sample Group Beta',
    code: 'BETA',
    status: 'pending-full',
    description: 'A second neutral record, proving the grid renders from the collection alone.',
    icon: PackagesIcon,
    metrics: [
      { id: 'services', label: 'Services', value: 18 },
      { id: 'inclusions', label: 'Inclusions', value: 54 },
      { id: 'packages', label: 'Packages', value: 8 },
    ],
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
      { id: 'archive', label: 'Archive' },
    ],
  },
  {
    id: 'sample-group-gamma',
    key: 'sample-group-gamma',
    name: 'Sample Group Gamma',
    code: 'GAMMA',
    status: 'disabled',
    description: 'A third neutral record. Its action set differs from its siblings — actions are data too.',
    icon: PromotionsIcon,
    metrics: [
      { id: 'services', label: 'Services', value: 9 },
      { id: 'inclusions', label: 'Inclusions', value: 27 },
      { id: 'packages', label: 'Packages', value: 3 },
    ],
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
      { id: 'restore', label: 'Restore' },
    ],
  },
];
