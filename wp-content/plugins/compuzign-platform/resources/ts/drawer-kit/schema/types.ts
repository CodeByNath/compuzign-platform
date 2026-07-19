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
import type { ModuleDefinition, ModuleState } from '../utils/moduleNotifications';
import type { IconId } from './icons';

// ── Modes — the viewpoint layer (§7) ─────────────────────────────────────────
// Viewpoints only. Surfaces (drawer, page) are environments provided by
// Groups and Stations, never modes. S2 registers renderers for `details`
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

// Stable graph identity for a bound module. Defined here rather than in the
// Command Centre's relations layer because `ShellBinding` carries it: the kit
// must describe every field it renders without importing a host. The relations
// layer re-uses these same declarations (it imports them from here).

export interface ManagerEntityRef {
  type: EntitySchema['id'];
  id: string | number;
}

export interface StationConnectionDescriptor {
  providerKey: string;
  relationshipKey: string;
  stationContext: ManagerEntityRef;
}

export interface ShellBinding<T = unknown> {
  data: T;                            // draft-preferred module data (presentation projection)
  state: ModuleState;                 // from evaluateModule — status + notes
  hasDraft: boolean;
  handlers: Record<string, () => void | Promise<void>>;  // keyed by action id
  busy?: string | null;               // action id in flight
  connection?: StationConnectionDescriptor; // stable graph identity for Connections/Manager parity
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
  saveDisabled?: boolean;              // station-supplied validation / unchanged gate
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
// station — never from the schema), and the built-in inline confirm
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

// ── Groups — the placement layer (§8, S4) ─────────────────────────────────────
// The unit of placement: which shell appears where, viewed through which mode.
// A slot names a module key; the owning manifest's `shells` record resolves it
// to a ShellSchema. Related stations' shells (the Connections group) register
// in the host manifest under their registry key — the same shared shell
// object, never a copy (the module is received by the same shell, viewed
// through a different mode, placed by a different group).

export interface ShellSlot {
  module: string;                    // module key (matches backend module key)
  mode: ShellMode;                   // the viewpoint this placement uses
  density?: 'full' | 'summary';      // may tighten, never expand, what renders
  // v1.2 (Collection placement amendment, 2026-07-07): placement-level footer
  // re-selection — select-only against the shell's Action Group; generalises
  // the connections View-only override. First realised by S6 (Category).
  footer?: string[];
}

// ── Station manifests (Entity Schemas, §9, S4) ────────────────────────────────
// The manifest declares — never re-implements — the station's identity,
// lifecycle participation, shells, and placements. StationLifecycle.php stays
// authoritative for transitions; manifest keys mirror backend module/endpoint
// keys exactly (a backend module addition without a matching manifest entry
// is a review-blocking finding).

export interface EntitySchema {
  id: 'service' | 'tier' | 'promotion' | 'category' | 'bundle' | string;
  label: { singular: string; plural: string };
  identity: { idOf: (d: any) => number | string; titleOf: (d: any) => string };

  lifecycle: {
    participation: 'canonical' | 'travelling-instance' | 'shell-occupant';
    statuses: Array<'draft' | 'active' | 'disabled' | 'archived' | 'trashed'>;
  };

  ownership?: { parent: EntitySchema['id']; label: string };

  shells: Record<string, ShellSchema<any>>;      // keyed by backend module key
  actions: Record<string, ShellActionSchema>;    // entity travel actions

  // permissions — reserved (§9): dark until the backend exposes capabilities
  // in the boot payload. Deliberately not declared until then.

  placements: {
    drawer?: { details: ShellSlot[]; connections: ShellSlot[] };   // Drawer Tab Contract keys
    // v1.2 Collection placement: one shell repeated per related item in the
    // slot's viewpoint (card = summary; repetition = placement; cardinality =
    // the surface's ShellBinding[]). Keyed by collection name; the slot's
    // module key resolves through `shells` (related stations' shells rule).
    collections?: Record<string, ShellSlot>;
    table?: TableSchema<any>;
    // Travel surfaces. `bin` is an S4 realisation: the Bin station's
    // consolidated table spans both travel scopes and is a real consumer.
    travel?: { archived: TableSchema<any>; trashed: TableSchema<any>; bin?: TableSchema<any> };
  };
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
