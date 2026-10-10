/*
 * Account Station — the public frontend boundary for the singleton Account/
 * Settings/Tools/Profile chain. Mirrors service-station/index.ts: the only
 * module other code should import from.
 *
 * INTERNAL IMPORTS: sibling files import from './types' / './api' directly,
 * never through this barrel.
 */

export type {
  AccountBrand,
  AccountDetail,
  AccountNode,
  AccountNodeKey,
  AccountNodes,
  AccountBrandPayload,
  AccountBrandSaveResponse,
  AccountBrandSettleResponse,
  AccountStatusPayload,
  AccountStatusResponse,
} from './types';

export {
  fetchAccountDetail,
  saveAccountBrand,
  settleAccountBrand,
  updateAccountStatus,
  publishAccount,
  disableAccount,
  enableAccount,
} from './api';

export { useAccountStation } from './useAccountStation';
export type { AccountStation } from './useAccountStation';
