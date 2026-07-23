/*
 * Shared pool contracts — the neutral owner of the inclusion and FAQ pool item
 * shapes exchanged across stations.
 *
 * Service owns the pools themselves (it creates and settles the canonical
 * items), but Package, Tier, and Promotion all read and reference them. Putting
 * these shapes in either the Service Station or api/types/admin.ts would force
 * one consumer to depend on another's boundary, so they live here instead.
 *
 * This module is a leaf: it imports nothing, so any station may depend on it
 * without risking a cycle.
 *
 * SCOPE: only genuinely cross-station pool contracts belong here. Service
 * request/response payloads live in service-station/types.ts;
 * Package- and Promotion-specific models stay in api/types/admin.ts.
 */

// ── Pool items ───────────────────────────────────────────────────────────────

export interface InclusionItem {
  id: string;
  label: string;
  // B2 — set by the admin read endpoints when the ref no longer resolves against
  // the service inclusion pool. The cached label is kept; the ref is never pruned.
  missing?: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

// ── Pool creation responses ──────────────────────────────────────────────────
//
// Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the pool;
// the caller attaches the returned id to a tier's module draft in a separate save.

export interface CreateInclusionPoolItemResponse {
  success:   boolean;
  existing:  boolean;
  inclusion: InclusionItem;
}

export interface CreateFaqPoolItemResponse {
  success:  boolean;
  existing: boolean;
  faq:      FaqItem;
}
