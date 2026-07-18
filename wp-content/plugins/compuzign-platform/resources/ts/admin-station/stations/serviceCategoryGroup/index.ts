// Service Category Group station — public barrel.
//
// The Admin Station's read boundary for the cz_service_category 'group' role.
// Consumers (AdminStationBody today) import the read hook from here, never the
// files behind it. State and endpoints stay inside; the presentation kit stays
// pure and unaware of the source.

export { useServiceCategoryGroupCards } from './useServiceCategoryGroupCards';
export type { ServiceCategoryGroupCardsResult } from './useServiceCategoryGroupCards';
export { toCategoryGroupCard, resolveCategoryGroupCardStatus } from './cardAdapter';
export { useServiceCategoryGroupRecord } from './useServiceCategoryGroupRecord';
export type { ServiceCategoryGroupRecordResult } from './useServiceCategoryGroupRecord';
export { ServiceCategoryGroupDrawerContent } from './ServiceCategoryGroupDrawerContent';
