/*
 * Service Station — the public frontend boundary for the cz_service entity.
 *
 * The only module other code should import from. It mirrors the backend
 * boundary (src/Modules/Service): everything the rest of the admin needs to
 * read, write, or type a Service, and nothing else.
 *
 * It owns the Service contracts, the Service endpoint functions, and the
 * Service state layer. This is a top-level peer Station, not part of the Admin
 * Station host: the Admin Station discovers and renders it through registries,
 * and other peers consume it only through this barrel. Service contracts and
 * endpoints are not re-exported from api/types/admin.ts or
 * api/endpoints/admin.ts — this barrel is the single public boundary.
 *
 * INTERNAL IMPORTS: sibling files import from './types' / './api' directly,
 * never through this barrel — importing your own barrel invites cycles. The
 * same applies to any module this station's own graph reaches: shared drawer-kit
 * utilities import './types' directly for that reason.
 *
 * Shared inclusion/FAQ pool item contracts are NOT owned here — they are shared
 * with Package, Tier, and Promotion and live in api/types/pools.ts.
 */

// ── Contracts ────────────────────────────────────────────────────────────────

export type {
  // Catalogue / Home summary
  ServiceSummary,
  ServiceCatalogResponse,
  // Detail
  ServiceDetail,
  // Pool items
  ServiceInclusionItem,
  ServiceFaqItem,
  // Drafts
  OverviewDraftData,
  ServiceModuleDrafts,
  // Edit drafts (held by the editors, part of the hook's save signatures)
  OverviewDraft,
  InclusionDraftItem,
  InclusionsDraft,
  FaqDraftItem,
  FaqsDraft,
  // Module draft I/O
  ServiceOverviewPayload,
  ServiceOverviewResponse,
  ServiceInclusionsPayload,
  ServiceInclusionsResponse,
  ServiceFaqsPayload,
  ServiceFaqsResponse,
  // Settle / revert
  PoolSettleWarning,
  ModuleSettleResponse,
  ModuleRevertResponse,
  // Lifecycle
  ServiceStatusPayload,
  ServiceStatusResponse,
  PermanentDeleteResponse,
  // Create
  CreateServicePayload,
  CreateServiceResponse,
} from './types';

// ── Endpoints ────────────────────────────────────────────────────────────────

export {
  // Catalogue
  fetchAdminCatalog,
  // Detail / create
  fetchAdminServiceDetail,
  createService,
  // Module draft saves
  updateServiceOverview,
  updateServiceInclusions,
  updateServiceFaqs,
  // Settle / revert
  settleServiceModule,
  settleAllServiceModules,
  revertServiceModule,
  // Lifecycle
  updateServiceStatus,
  archiveService,
  trashService,
  restoreService,
  permanentDeleteService,
  // Pools
  createServiceInclusionPoolItem,
  createServiceFaqPoolItem,
} from './api';

// ── State ────────────────────────────────────────────────────────────────────
//
// The Service drawer's state layer. Its result types are part of the hook's
// public signature, so they are exported alongside it.

export { useServiceStation } from './useServiceStation';

export type {
  ServiceStation,
  ToggleActiveResult,
  SettleModulesResult,
  PublishServiceResult,
} from './useServiceStation';
