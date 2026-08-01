// Module status notes — the shared derived-notification engine.
// Each ModuleDefinition produces ModuleNote[] from live data; nothing is persisted.
// Used by ModuleStatusPill (marker count) and ModuleNotificationPanel (note list).
//
// Entity-specific rule groups live in the sibling domain files (service, package,
// tier, promotion, category, packageFamily); this file owns only the generic
// module model and the single evaluator every domain shares.

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
  platformLabel?:    string;   // entity name used by the shared inactive-state note
  // Explicit Disable mask (Service today — see ServiceMeta.previous_platform_status).
  // Never inferred from a record simply never activated. Only a station that sets
  // this opts in; every other domain leaves it undefined and is unaffected.
  disabled?:         boolean;
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
    return [{ id: `${key}.platform.inactive`, message: `Waiting for ${ctx.platformLabel ?? 'service'} publication`, type: 'info' }];
  if (includeDraft && ctx.hasDraft)
    return [{ id: `${key}.module.draft`, message: 'Draft saved — settle to publish', type: 'info' }];
  if (ctx.moduleTransition === 'pending')
    return [{ id: `${key}.module.pending`, message: 'Changes ready to settle', type: 'info' }];
  return [];
}

// Single evaluator for any module. Returns the 5-state status and the note list.
export function evaluateModule<T>(def: ModuleDefinition<T>, data: T, ctx: NoteContext): ModuleState {
  // Explicit Disable mask — takes precedence over every other state, including
  // not-configured: Disable masks the whole record's modules. Opt-in per ctx.disabled.
  if (ctx.disabled) {
    return {
      status: 'disabled',
      notes:  [{ id: `${def.key}.platform.disabled`, message: `${ctx.platformLabel ?? 'Record'} is disabled`, type: 'info' }],
    };
  }

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
