// Module status notes — derived notification layer for ServiceViewStep module cards.
// Each generator produces ModuleNote[] from live data; nothing is persisted.
// Used by ModuleStatusPill (marker count) and ModuleNotificationPanel (note list).

import type { ServiceInclusion, ServiceFaq } from '@/api/types/cost-builder';
import type { OverviewDraftData, SurfacePackageSummary } from '@/api/types/admin';
import { checkOverviewCompleteness, checkOverviewCompletenessFromDraft } from './moduleStatus';
import type { TierLike } from './moduleStatus';
import type { ServiceItem } from '@/api/types/cost-builder';

export interface ModuleNote {
  id:      string;                        // stable dot-path key for React rendering
  message: string;                        // human-readable note shown in the panel
  type:    'error' | 'warning' | 'info'; // error = counts toward badge; info = panel only; warning = reserved
}

export interface NoteContext {
  platformStatus:    string;   // 'active' | 'disabled' | 'archived' | 'trashed'
  moduleTransition?: string;   // 'settled' | 'pending' | 'not-configured' | undefined
  hasDraft?:         boolean;  // true when a draft exists for this module
}

// Only 'error' notes increment the numeric badge on the pill.
// 'info' and 'warning' notes appear in the notification panel but do not count.
export function noteCount(notes: ModuleNote[]): number {
  return notes.filter(n => n.type === 'error').length;
}

// ── Per-module generators ─────────────────────────────────────────────────────

export function getOverviewNotes(
  service: ServiceItem,
  ctx: NoteContext,
  draft?: OverviewDraftData | null,
): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Prefer draft completeness when a draft exists.
  const c = draft
    ? checkOverviewCompletenessFromDraft(draft)
    : checkOverviewCompleteness(service);

  if (!c.title)    notes.push({ id: 'overview.title.missing',    message: 'Title missing',         type: 'error' });
  // excerpt (short description) is disabled from the workflow — no notification fired for missing excerpt.
  if (!c.category) notes.push({ id: 'overview.category.missing', message: 'Category not selected', type: 'error' });
  if (!c.content)  notes.push({ id: 'overview.content.missing',  message: 'Description missing',   type: 'error' });

  // Info notes — shown in the panel but do not produce a numeric badge.
  if (c.complete) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'overview.platform.inactive', message: 'Waiting for service activation', type: 'info' });
    else if (ctx.hasDraft)
      notes.push({ id: 'overview.module.draft',      message: 'Draft saved — settle to publish', type: 'info' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'overview.module.pending',    message: 'Changes ready to settle',         type: 'info' });
  }

  return notes;
}

export function getInclusionsNotes(inclusions: ServiceInclusion[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Empty inclusions: the module is editable (service exists) but has nothing yet.
  // Surface the action prompt so the Pending pill opens with guidance.
  if (inclusions.length === 0) {
    notes.push({ id: 'inclusions.empty.action', message: 'Edit and add features.', type: 'info' });
    return notes;
  }

  const unlabelled = inclusions.filter(i => !i.label?.trim()).length;
  if (unlabelled > 0)
    notes.push({
      id:      'inclusions.labels.missing',
      message: `${unlabelled} feature${unlabelled !== 1 ? 's have' : ' has'} no label`,
      type:    'error',
    });

  // Info notes when all labels are present.
  if (unlabelled === 0) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'inclusions.platform.inactive', message: 'Waiting for service activation', type: 'info' });
    else if (ctx.hasDraft)
      notes.push({ id: 'inclusions.module.draft',      message: 'Draft saved — settle to publish', type: 'info' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'inclusions.module.pending',    message: 'Changes ready to settle',         type: 'info' });
  }

  return notes;
}

export function getFaqsNotes(faqs: ServiceFaq[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Zero FAQs: the module is editable (service exists) but has nothing yet.
  // Surface the action prompt so the Pending pill opens with guidance.
  if (faqs.length === 0) {
    notes.push({ id: 'faqs.empty.action', message: 'Edit and add questions.', type: 'info' });
    return notes;
  }

  const noQ = faqs.filter(f => !f.question?.trim()).length;
  const noA = faqs.filter(f => !f.answer?.trim()).length;

  if (noQ > 0)
    notes.push({
      id:      'faqs.question.missing',
      message: `${noQ} question${noQ !== 1 ? 's are' : ' is'} missing a question`,
      type:    'error',
    });
  if (noA > 0)
    notes.push({
      id:      'faqs.answer.missing',
      message: `${noA} question${noA !== 1 ? 's are' : ' is'} missing an answer`,
      type:    'error',
    });

  // Info notes when all questions and answers are complete.
  if (noQ === 0 && noA === 0) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'faqs.platform.inactive', message: 'Waiting for service activation', type: 'info' });
    else if (ctx.hasDraft)
      notes.push({ id: 'faqs.module.draft',      message: 'Draft saved — settle to publish', type: 'info' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'faqs.module.pending',    message: 'Changes ready to settle',         type: 'info' });
  }

  return notes;
}

// ── Commercial generators (Package Station) ───────────────────────────────────
// Mirror the Service module generators: empty/editable → info action prompt,
// completeness gap → error, complete → lifecycle info. Pure functions; no call
// sites yet (added for the Package Summary migration, Step 1).

// Package Summary card. `pkg` is the service's related Package Station summary, or
// null when no package exists yet. A tier counts as configured via its `configured` flag.
export function getPackageNotes(pkg: SurfacePackageSummary | null, ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  const configuredTierCount = pkg
    ? Object.values(pkg.tiers).filter(t => t?.configured).length
    : 0;

  // No package, or no tier configured yet: editable but empty — surface the action prompt.
  if (!pkg || configuredTierCount === 0) {
    notes.push({ id: 'package.empty.action', message: 'Edit and configure pricing tiers.', type: 'info' });
    return notes;
  }

  // Tiers configured: lifecycle info only.
  if (ctx.platformStatus !== 'active')
    notes.push({ id: 'package.platform.inactive', message: 'Waiting for service activation', type: 'info' });
  else if (ctx.moduleTransition === 'pending')
    notes.push({ id: 'package.module.pending',    message: 'Changes ready to settle',         type: 'info' });

  return notes;
}

// Single tier card. `tier` is the tier summary/detail (structural `TierLike`), or
// undefined for an unconfigured slot. `contact` (when present) counts as a price.
export function getTierNotes(tier: TierLike | undefined, ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  const hasPrice = !!tier && (tier.price !== null || !!tier.contact);
  const hasCycle = !!tier && !!tier.billing_cycle;

  // Empty/unconfigured tier: editable but nothing set yet — surface the action prompt.
  if (!tier || (!hasPrice && !hasCycle)) {
    notes.push({ id: 'tier.empty.action', message: 'Edit and configure this tier.', type: 'info' });
    return notes;
  }

  // Partially configured: a required pricing field is missing.
  if (!hasPrice || !hasCycle)
    notes.push({ id: 'tier.pricing.incomplete', message: 'Add price and billing cycle to complete this tier.', type: 'error' });

  // Complete: lifecycle info.
  if (hasPrice && hasCycle) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'tier.platform.inactive', message: 'Waiting for service activation', type: 'info' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'tier.module.pending',    message: 'Changes ready to settle',         type: 'info' });
  }

  return notes;
}
