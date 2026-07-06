// Schema layer descriptor interfaces (Schema architecture S2).
//
// The shell layer of the Living Architecture: reusable presentation shells
// that receive Station DNA and organise it into Schema Groups. Everything in
// this file is presentation description only — it contains no DNA and never
// will. Status and notifications are delivered through `ShellBinding.state`
// (from `evaluateModule`); a shell never computes status, never derives
// notes, never owns business truth, never calls endpoints.
//
// Canonical spec: docs/architecture/SchemaWorkstationArchitecture-v1.md §§3–8.

import type { ComponentChildren } from 'preact';
import type { ModuleDefinition, ModuleState } from '@/components/admin/utils/moduleNotifications';
import type { IconId } from './icons';

// ── Modes — the viewpoint layer (§7) ─────────────────────────────────────────
// Viewpoints only. Surfaces (drawer, page) are environments provided by
// Groups and Workstations, never modes. S2 registers renderers for `details`
// and wires `edit`; the remaining viewpoints arrive with their phases
// (S3a: connections/summary, S3b: table, card on adoption).

export type ShellMode = 'details' | 'connections' | 'edit' | 'summary' | 'table' | 'card';

// ── Platform Elements — content vocabulary (§6) ──────────────────────────────
// The launch library (v1.0, locked). Ids are semantic, never entity-specific,
// never render-flavoured. `custom` is the first-class permanent escape hatch;
// every use is logged as a candidate element (promotion needs 2+ consumers).

export type PlatformElementId =
  | 'text' | 'rich-text' | 'term'            // Overview content: Name, Description, Category
  | 'item-collection' | 'qa-collection'      // Child content: Inclusions chips, FAQs
  | 'relation-summary'                       // compact child-relation counts (S3a amendment)
  | 'metrics'                                // at-a-glance headline + copy (S3a amendment)
  | 'custom';                                // escape hatch

// ── Station DNA delivery (§3) ─────────────────────────────────────────────────
// The one object through which DNA reaches a shell, produced by the station
// hook / assembling step at render time. DNA flows one way, Station → Shell.

export interface ShellBinding<T = unknown> {
  data: T;                            // draft-preferred module data (presentation projection)
  state: ModuleState;                 // from evaluateModule — status + notes
  hasDraft: boolean;
  handlers: Record<string, () => void | Promise<void>>;  // keyed by action id
  busy?: string | null;               // action id in flight
}

// ── Schema Groups (§4) ────────────────────────────────────────────────────────

export interface HeaderGroup<T> {
  title: string; subtitle?: string;
  icon: IconId; iconVariant?: string; scopeClass?: string;
  count?: (data: T) => number | null;
}

export interface ContentElement<T> {
  id: string;                      // 'name' | 'description' | 'quantity' | …
  element: PlatformElementId;
  label?: string;
  bind: (data: T) => unknown;      // data access only — the element's bound-value
                                   // contract (schema/elements/library.ts) defines the shape
  when?: (data: T) => boolean;     // data-driven presence only — never mode logic
}

export interface ShellActionSchema {
  id: string;                          // 'edit' | 'discard-draft' | 'view' | …
  label: string;
  intent: 'primary' | 'secondary' | 'danger';
  confirm?: { prompt: string; confirmLabel: string };   // shared inline-confirm
  when?: (b: ShellBinding) => boolean;                  // e.g. b.hasDraft
}

export interface FooterGroup { actions: string[] }

// ── Edit-mode binding ─────────────────────────────────────────────────────────
// Editing stays module-level inside InlineEditorShell, permanently (Edit
// Granularity, locked): the lifecycle engine's draft envelope is per-module.
// The edit session (draft state, save/cancel, dirty detection) is owned by the
// assembling step; the schema declares only which module editor renders.

export interface ShellEditSession {
  draft: unknown;                                   // the module's working draft
  patch?:  (partial: Record<string, unknown>) => void;  // merge into the draft (object drafts)
  replace: (next: unknown) => void;                     // swap the whole draft
  onSave:   () => Promise<void> | void;
  onCancel: () => void;
  saving:  boolean;
  saveErr: string | null;
  isDirty: boolean;
  title?:  string;                    // session title override (e.g. the instance's own name)
  extras?: Record<string, unknown>;   // editor-specific session props (e.g. category list)
}

export interface ShellEditorSchema {
  render: (session: ShellEditSession) => ComponentChildren;
}

// ── Shell Schema (§4) ─────────────────────────────────────────────────────────
// Stable Contract (locked): Header, Content, Footer, Action, plus
// DNA-delivered Notifications and Status. Never changes for implementation
// convenience; evolves only by formal amendment. Normal evolution = Platform
// Elements joining the Content Group.

// ── Table mode — row projection (§9, S3b) ─────────────────────────────────────
// A TableSchema drives the EntityTable renderer: columns project row data,
// row actions declare intent (behaviour arrives as handlers from the owning
// workstation — never from the schema), and the built-in inline confirm
// replaces the per-surface copied confirm blocks. In S4 these embed into
// EntitySchema.placements (table / travel).

export interface ColumnDef<Row> {
  id: string;
  label: string;
  cell: (row: Row) => ComponentChildren;   // data projection → cell content
  width?: string;                          // explicit width (rarely used; layout is class-driven)
  className?: string;                      // header/layout class (S3b realisation)
  cellClassName?: string;                  // body-cell class when it differs from the header's
}

export interface RowActionDef<Row> {
  id: string;                              // handler key, e.g. 'restore' | 'trash' | 'delete' | 'view'
  label: string;
  intent: 'primary' | 'secondary' | 'danger';
  confirm?: { prompt: string; confirmLabel: string };   // built-in inline confirm
  when?: (row: Row) => boolean;            // data-driven presence only
  busyLabel?: string;                      // in-flight button text (S3b realisation)
  icon?: ComponentChildren;                // icon-only rendering; label becomes aria-label/title
}

export interface TableSchema<Row> {
  columns: ColumnDef<Row>[];               // { id, label, cell(row), width? }
  rowActions: RowActionDef<Row>[];         // { id, label, intent, confirm?, when? }
  empty: { message: string; cta?: { label: string; actionId: string } };
  scope?: 'current' | 'archived' | 'trashed';
  actionsLabel?: string;                   // actions column header (default 'Actions')
}

export interface ShellSchema<T = unknown> {
  archetype: 'overview' | 'child';     // §5 — the two shell behaviours
  // Reference to the living module — composition, never inheritance; the
  // definition stays in utils/moduleNotifications.ts, untouched. Typed loosely
  // because the DNA's data contract is the module's own, while T is the
  // presentation projection the station hook delivers; they meet in the
  // binding file, not in this reference.
  dna: ModuleDefinition<any>;

  header:  HeaderGroup<T>;             // identity elements: title, subtitle, icon id, count
  content: ContentElement<T>[];        // Content Group — Platform Element instances (§6)
  footer:  FooterGroup;                // ordered action ids
  actions: Record<string, ShellActionSchema>;  // Action Group
  editor?: ShellEditorSchema;          // Edit-mode binding (InlineEditorShell + module editor)
  // Notification Group = delivered via ShellBinding.state.notes (DNA, not schema)
  // Status             = delivered via ShellBinding.state.status (DNA, not schema)
}
