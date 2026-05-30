export interface AdminOverview {
  services_published: number;
  services_draft: number;
  health: Record<string, boolean>;
  platform_version: string | null;
}

export type WorkstationId =
  | 'overview'
  | 'service-catalog'
  | 'pricing'
  | 'promotions'
  | 'bundles'
  | 'featured'
  | 'requests'
  | 'health'
  | 'surface-packages';

export interface WorkstationDef {
  id: WorkstationId;
  label: string;
  icon: string;
  group: string;
}

export const WORKSTATIONS: WorkstationDef[] = [
  { id: 'overview',          label: 'Overview',          icon: '◈', group: 'command'    },
  { id: 'service-catalog',   label: 'Service Catalog',   icon: '⚙', group: 'catalog'    },
  { id: 'pricing',           label: 'Pricing',           icon: '¤', group: 'catalog'    },
  { id: 'surface-packages',  label: 'Surface Packages',  icon: '◧', group: 'catalog'    },
  { id: 'promotions',        label: 'Promotions',        icon: '◷', group: 'catalog'    },
  { id: 'bundles',           label: 'Bundles',           icon: '❐', group: 'catalog'    },
  { id: 'featured',          label: 'Featured Controls', icon: '◆', group: 'catalog'    },
  { id: 'requests',          label: 'Requests & Quotes', icon: '◎', group: 'operations' },
  { id: 'health',            label: 'Health & Status',   icon: '◉', group: 'operations' },
];

export const WORKSTATION_LABELS: Record<WorkstationId, string> = Object.fromEntries(
  WORKSTATIONS.map((w) => [w.id, w.label]),
) as Record<WorkstationId, string>;

// ── Requests river types ─────────────────────────────────────────────────────

export interface RequestLine {
  serviceId: number;
  serviceTitle: string;
  categoryName: string;
  tierTitle: string;
  tierId: string;
  price: number | null;
  billingCycle: string;
  features: string[];
}

export interface RequestEntry {
  quote_ref: string;
  type: string;
  contact: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  category?: string;
  items: RequestLine[];
  submitted: string;
}

export interface RequestSummary {
  quote_ref: string;
  type?: string;
  contact: string;
  company: string;
  email: string;
  phone: string;
  category?: string;
  submitted: string;
  item_count: number;
  total: number | null;
  // Additive — Phase 1B: true when a Water record exists for this intake item.
  is_accepted?: boolean;
}

// ── Surface Packages river types ─────────────────────────────────────────────

export interface SurfaceTierSummary {
  label: string;
  price: number | null;
  billing_cycle: string | null;
  inclusion_count: number;
  faq_count: number;
  enabled: boolean;
}

export interface SurfaceServiceRef {
  id: number;
  title: string;
  slug: string;
}

export interface SurfacePackageSummary {
  post_id: number;
  post_status: string;
  title: string;
  package_type: string;
  service_refs: number[];
  services: SurfaceServiceRef[];
  tiers: Record<string, SurfaceTierSummary>;
  popular_tier: string | null;
  faq_refs: string[];
  display_contexts: string[];
  migration_complete: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export interface SurfacePackagesResponse {
  success: boolean;
  total: number;
  packages: SurfacePackageSummary[];
}

// ── Surface Package detail / tier-management types ────────────────────────────

export interface InclusionItem {
  id: string;
  label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SurfaceTierDetail {
  label: string;
  price: number | null;
  billing_cycle: string | null;
  inclusions_override: InclusionItem[];
  features: string[];
  faq_refs: string[];
  enabled: boolean;
}

export interface SurfaceServiceInfo {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  inclusions: InclusionItem[];
  faqs: FaqItem[];
}

export interface SurfacePackageDetailData {
  post_id: number;
  post_status: string;
  title: string;
  package_type: string;
  service_refs: number[];
  tiers: Record<string, SurfaceTierDetail>;
  popular_tier: string | null;
  faq_refs: string[];
  display_contexts: string[];
  migration_complete: boolean;
}

export interface SurfacePackageDetailResponse {
  success: boolean;
  package: SurfacePackageDetailData;
  service: SurfaceServiceInfo | null;
}

export interface TierSavePayload {
  label: string;
  price: number | null;
  billing_cycle: string;
  inclusions_override: InclusionItem[];
  faq_refs: string[];
  popular: boolean;
  enabled: boolean;
  new_inclusions: Array<{ label: string }>;
  new_faqs: Array<{ question: string; answer: string }>;
}

export interface TierSaveResponse {
  success: boolean;
  package_meta: SurfacePackageDetailData;
  new_inclusions_added: number;
  new_faqs_added: number;
}

export interface PackageStatusResponse {
  success: boolean;
  post_status: string;
}

export interface AcceptIntakeResponse {
  success: boolean;
  post_id: number;
  quote_ref: string;
  status: string;
  accepted_at: string;
  already_accepted: boolean;
}

export interface AdminRequestsResponse {
  success: boolean;
  requests: RequestSummary[];
  total: number;
}
