// Module status notes — derived notification layer for ServiceViewStep module cards.
// Each generator produces ModuleNote[] from live data; nothing is persisted.
// Used by ModuleStatusPill (marker count) and ModuleNotificationPanel (note list).

import type { ServiceInclusion, ServiceFaq } from '@/api/types/cost-builder';
import type { OverviewDraftData, SurfacePackageSummary } from '@/api/types/admin';
import {
  checkOverviewCompleteness,
  checkOverviewCompletenessFromDraft,
  resolveOverviewStatus,
  resolvePackageStatus,
  resolveTierStatus,
} from './moduleStatus';
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
  // Parent → child activation. A child module declares requiresParent; the
  // assembling screen supplies whether the parent is ready. When it is not, the
  // child resolves to pending-dim + an info note — NOT a new status value.
  parentReady?:      boolean;  // true once the parent module is complete
  parentLabel?:      string;   // parent name shown in the waiting note, e.g. 'Tier Overview'
}

// Only 'error' notes increment the numeric badge on the pill.
// 'info' and 'warning' notes appear in the notification panel but do not count.
export function noteCount(notes: ModuleNote[]): number {
  return notes.filter(n => n.type === 'error').length;
}

// ── Generic module model ──────────────────────────────────────────────────────
// Every module (Service Overview, Included Features, Pricing/Tier, Promotion, …)
// is described once by a ModuleDefinition and resolved by a single shared engine.
// The engine owns the lifecycle behaviour common to all modules:
//   parent gate → empty prompt → problems (errors) → lifecycle tail.
// A module only declares what differs: emptiness, problems, prompt text, and how
// to resolve its status. No module invents its own notification flow, so every
// entity (Service, Package, Promotion, Campaign, Subscription, Case Study) can
// assemble these modules instead of adding entity-specific generators.
//
// Status values are unchanged — the existing 5-state model only:
//   'active' | 'pending-full' | 'pending-dim' | 'disabled' | 'not-configured'.
// A blocked/"waiting" child resolves to 'pending-dim' with an info note; "waiting"
// is NOT a status — there is no new pill, class, or lifecycle value.

export interface ModuleState {
  status: string;        // existing 5-state value
  notes:  ModuleNote[];
}

export interface ModuleDefinition<T> {
  key:                 string;                                 // id prefix for notes
  emptyPrompt?:        string;                                 // info note when isEmpty()
  isEmpty?:            (data: T) => boolean;
  problems:            (data: T) => ModuleNote[];              // error notes (incomplete)
  includeDraftInTail?: boolean;                                // surface the draft-saved info note
  requiresParent?:     boolean;                                // gate on ctx.parentReady
  resolveStatus?:      (data: T, ctx: NoteContext) => string;  // → existing 5-state value
}

// Lifecycle tail — identical across every module once it is complete.
// Kept in one place because it was previously copy-pasted into all five generators.
function lifecycleTail(key: string, ctx: NoteContext, includeDraft?: boolean): ModuleNote[] {
  if (ctx.platformStatus !== 'active')
    return [{ id: `${key}.platform.inactive`, message: 'Waiting for service activation', type: 'info' }];
  if (includeDraft && ctx.hasDraft)
    return [{ id: `${key}.module.draft`, message: 'Draft saved — settle to publish', type: 'info' }];
  if (ctx.moduleTransition === 'pending')
    return [{ id: `${key}.module.pending`, message: 'Changes ready to settle', type: 'info' }];
  return [];
}

// Single evaluator for any module. Returns the 5-state status and the note list.
export function evaluateModule<T>(def: ModuleDefinition<T>, data: T, ctx: NoteContext): ModuleState {
  // Parent gate: a child whose parent is not ready is pending-dim + an info note.
  const gated  = !!def.requiresParent && ctx.parentReady !== true;
  const status = gated
    ? 'pending-dim'
    : def.resolveStatus ? def.resolveStatus(data, ctx) : 'pending-dim';

  let notes: ModuleNote[];
  if (gated) {
    notes = [{
      id:      `${def.key}.parent.waiting`,
      message: `Waiting for ${ctx.parentLabel ?? 'the previous step'}.`,
      type:    'info',
    }];
  } else if (def.isEmpty?.(data)) {
    // Editable but empty — surface the action prompt so the Pending pill opens with guidance.
    notes = def.emptyPrompt
      ? [{ id: `${def.key}.empty.action`, message: def.emptyPrompt, type: 'info' }]
      : [];
  } else {
    // Incomplete → errors; complete → the shared lifecycle tail.
    const problems = def.problems(data);
    notes = problems.length ? problems : lifecycleTail(def.key, ctx, def.includeDraftInTail);
  }

  return { status, notes };
}

// Notes-only convenience for callers that resolve status separately.
export function evaluateModuleNotes<T>(def: ModuleDefinition<T>, data: T, ctx: NoteContext): ModuleNote[] {
  return evaluateModule(def, data, ctx).notes;
}

// ── Module definitions ────────────────────────────────────────────────────────
// Each entity screen assembles these; none owns notification-flow logic.

// Service Overview.
export const overviewModule: ModuleDefinition<{ service: ServiceItem; draft?: OverviewDraftData | null }> = {
  key:                'overview',
  includeDraftInTail: true,
  problems: ({ service, draft }) => {
    const c = draft ? checkOverviewCompletenessFromDraft(draft) : checkOverviewCompleteness(service);
    const out: ModuleNote[] = [];
    if (!c.title)    out.push({ id: 'overview.title.missing',    message: 'Title missing',         type: 'error' });
    // excerpt (short description) is intentionally excluded from the workflow.
    if (!c.category) out.push({ id: 'overview.category.missing', message: 'Category not selected', type: 'error' });
    if (!c.content)  out.push({ id: 'overview.content.missing',  message: 'Description missing',   type: 'error' });
    return out;
  },
  resolveStatus: ({ service, draft }, ctx) =>
    resolveOverviewStatus(service, {
      platformStatus:   ctx.platformStatus,
      moduleTransition: ctx.moduleTransition ?? 'not-configured',
    }, draft),
};

// Included Features (service-level).
export const inclusionsModule: ModuleDefinition<ServiceInclusion[]> = {
  key:                'inclusions',
  includeDraftInTail: true,
  emptyPrompt:        'Edit and add features.',
  isEmpty:            (items) => items.length === 0,
  problems: (items) => {
    const unlabelled = items.filter(i => !i.label?.trim()).length;
    return unlabelled > 0
      ? [{ id: 'inclusions.labels.missing', message: `${unlabelled} feature${unlabelled !== 1 ? 's have' : ' has'} no label`, type: 'error' }]
      : [];
  },
};

// Common Questions (service-level).
export const faqsModule: ModuleDefinition<ServiceFaq[]> = {
  key:                'faqs',
  includeDraftInTail: true,
  emptyPrompt:        'Edit and add questions.',
  isEmpty:            (items) => items.length === 0,
  problems: (items) => {
    const out: ModuleNote[] = [];
    const noQ = items.filter(f => !f.question?.trim()).length;
    const noA = items.filter(f => !f.answer?.trim()).length;
    if (noQ > 0) out.push({ id: 'faqs.question.missing', message: `${noQ} question${noQ !== 1 ? 's are' : ' is'} missing a question`, type: 'error' });
    if (noA > 0) out.push({ id: 'faqs.answer.missing',   message: `${noA} question${noA !== 1 ? 's are' : ' is'} missing an answer`, type: 'error' });
    return out;
  },
};

// Package Summary (whole package). A tier counts as configured via its `configured` flag.
export const packageModule: ModuleDefinition<SurfacePackageSummary | null> = {
  key:         'package',
  emptyPrompt: 'Edit and configure pricing tiers.',
  isEmpty: (pkg) => {
    const configured = pkg ? Object.values(pkg.tiers).filter(t => t?.configured).length : 0;
    return !pkg || configured === 0;
  },
  problems:      () => [],
  resolveStatus: (pkg) => resolvePackageStatus(pkg),
};

// ── Tier / pricing modules ────────────────────────────────────────────────────
// Shared completeness for a single tier's pricing (price + billing cycle).

function tierIsEmpty(t: TierLike | undefined): boolean {
  const hasPrice = !!t && (t.price !== null || !!t.contact);
  const hasCycle = !!t && !!t.billing_cycle;
  return !t || (!hasPrice && !hasCycle);
}

function tierPricingProblems(key: string, t: TierLike | undefined): ModuleNote[] {
  const hasPrice = !!t && (t.price !== null || !!t.contact);
  const hasCycle = !!t && !!t.billing_cycle;
  return (!hasPrice || !hasCycle)
    ? [{ id: `${key}.pricing.incomplete`, message: 'Add price and billing cycle to complete this tier.', type: 'error' }]
    : [];
}

// Whole-tier card used by the Package Overview list.
export const tierModule: ModuleDefinition<TierLike | undefined> = {
  key:           'tier',
  emptyPrompt:   'Edit and configure this tier.',
  isEmpty:       tierIsEmpty,
  problems:      (t) => tierPricingProblems('tier', t),
  resolveStatus: (t, ctx) => resolveTierStatus(t, { pkgStatus: ctx.platformStatus }),
};

// Individual Package (Tier) sub-modules — assembled by the tier drawer.
// Tier Overview owns the tier's pricing; Features and FAQs gate on it via parentReady.
// When the parent (Tier Overview) is not complete they resolve to pending-dim with
// a "Waiting for Tier Overview." info note (supplied via ctx.parentLabel).

export const tierOverviewModule: ModuleDefinition<TierLike | undefined> = {
  key:           'tier-overview',
  emptyPrompt:   'Edit and configure this tier.',
  isEmpty:       tierIsEmpty,
  problems:      (t) => tierPricingProblems('tier-overview', t),
  resolveStatus: (t, ctx) => resolveTierStatus(t, { pkgStatus: ctx.platformStatus }),
};

export const tierFeaturesModule: ModuleDefinition<{ count: number }> = {
  key:            'tier-features',
  requiresParent: true,
  emptyPrompt:    'Edit and add features.',
  isEmpty:        ({ count }) => count === 0,
  problems:       () => [],
  resolveStatus:  ({ count }, ctx) =>
    count === 0 ? 'pending-dim' : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

export const tierFaqsModule: ModuleDefinition<{ count: number }> = {
  key:            'tier-faqs',
  requiresParent: true,
  emptyPrompt:    'Edit and add questions.',
  isEmpty:        ({ count }) => count === 0,
  problems:       () => [],
  resolveStatus:  ({ count }, ctx) =>
    count === 0 ? 'pending-dim' : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

// ── Backward-compatible generators ────────────────────────────────────────────
// Existing call sites keep their signatures; each now delegates to the shared
// engine, so module-notification behaviour has a single source of truth.

export function getOverviewNotes(
  service: ServiceItem,
  ctx: NoteContext,
  draft?: OverviewDraftData | null,
): ModuleNote[] {
  return evaluateModuleNotes(overviewModule, { service, draft }, ctx);
}

export function getInclusionsNotes(inclusions: ServiceInclusion[], ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(inclusionsModule, inclusions, ctx);
}

export function getFaqsNotes(faqs: ServiceFaq[], ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(faqsModule, faqs, ctx);
}

export function getPackageNotes(pkg: SurfacePackageSummary | null, ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(packageModule, pkg, ctx);
}

export function getTierNotes(tier: TierLike | undefined, ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(tierModule, tier, ctx);
}
