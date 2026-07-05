// Presentation Status Contract — the single source (Schema architecture S1a).
//
// The one place in the platform where a status string maps to a pill label and
// class. Every pill renderer delegates here; no other file may define a
// status→label/class mapping. Canonical rule and derivation:
// docs/architecture/AdminWorkstationDrawerPrinciples-v1.md → Presentation
// Status Contract. Chokepoint role:
// docs/architecture/SchemaWorkstationArchitecture-v1.md → §11.
//
// Vocabulary: pills render ONLY Active / Pending / Disabled, derived from
// lifecycle + module state + notifications. Archived / Trashed are travel
// data labels (TRAVEL_PILL below) and may be imported by travel-surface
// renderers only — never by drawer module pills.

export interface PillMeta {
  cls:   string;   // full modifier class, e.g. 'cz-module-status-pill--active'
  label: string;
}

// ── Presentation pills — the entire contract vocabulary ──────────────────────

export const PRESENTATION_PILL: Record<'active' | 'pending' | 'disabled', PillMeta> = {
  active:   { cls: 'cz-module-status-pill--active',   label: 'Active'   },
  pending:  { cls: 'cz-module-status-pill--pending',  label: 'Pending'  },
  disabled: { cls: 'cz-module-status-pill--inactive', label: 'Disabled' },
};

// Contract fallback: unknown or in-flight statuses present as Pending.
export const PILL_FALLBACK: PillMeta = PRESENTATION_PILL.pending;

// 5-state resolver vocabulary (moduleStatus.tsx resolvers) → presentation pill.
// This is the collapse the contract mandates: both pending flavours present as
// Pending; the dim/full distinction affects opacity (parent wrapper), never label.
export const PILL_META: Record<string, PillMeta> = {
  'active':       PRESENTATION_PILL.active,
  'disabled':     PRESENTATION_PILL.disabled,
  'pending-dim':  PRESENTATION_PILL.pending,
  'pending-full': PRESENTATION_PILL.pending,
};

// ── Status dots (list rows / summaries) — same 5-state keys as PILL_META ─────

export const STATUS_DOT_COLOR: Record<string, string> = {
  'active':       'var(--admin-success)',
  'disabled':     'var(--admin-error)',
  'pending-dim':  'var(--admin-warning)',
  'pending-full': 'var(--admin-warning)',
};
export const STATUS_DOT_FAINT_COLOR = 'var(--admin-text-faint)';

export const STATUS_DOT_CLASS: Record<string, string> = {
  'active':       'cz-admin-status-dot--active',
  'disabled':     'cz-admin-status-dot--inactive',
  'pending-dim':  'cz-admin-status-dot--pending',
  'pending-full': 'cz-admin-status-dot--pending',
};
export const STATUS_DOT_FAINT_CLASS = 'cz-admin-status-dot--faint';

// Legacy fallback used only by renderModuleStatus() for statuses outside the
// 5-state vocabulary. Preserves the pre-S1a muted `--draft` styling exactly
// (label is still Pending — the class is a styling vestige, not a Draft pill).
// Retire when the last unknown-status pathway closes.
export const LEGACY_UNKNOWN_PILL: { dot: string; cls: string; label: string } = {
  dot:   STATUS_DOT_FAINT_COLOR,
  cls:   'cz-module-status-pill--draft',
  label: 'Pending',
};

// ── Travel pills — TRAVEL SURFACES ONLY ──────────────────────────────────────
// Archived/Trashed are operational travel states named as data labels on bin
// and travel surfaces (occupant bins, promotion bin rows, bin/archive/trash
// tables). They are never drawer/module status pills. Importing TRAVEL_PILL
// into a non-travel renderer is a contract violation.

export const TRAVEL_PILL: Record<'archived' | 'trashed', PillMeta> = {
  archived: { cls: 'cz-module-status-pill--inactive', label: 'Archived' },
  trashed:  { cls: 'cz-module-status-pill--inactive', label: 'Trashed'  },
};
