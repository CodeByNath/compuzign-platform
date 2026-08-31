// Drawer contracts — the zero-dependency type module for the drawer axis.
//
// Kept separate from drawerRegistry.tsx so both the registry (which value-imports
// the entity content) and the entity content (which needs only these types) can
// import from here without forming a cycle. Its one import is the shell's
// zero-dependency identity type.

import type { ComponentChildren } from 'preact';
import type { StationRecordId } from './recordIdentity';

// Opening intent only. The composition always owns Overview / Connections and
// module-level editing; `edit` means open directly into its primary module.
export type DrawerMode = 'view' | 'edit';

// Declared panel size for a registered drawer. Coordination only: the key
// travels with the registration and Admin Station's shell decides what each
// size means in CSS. A template that declares none renders at `normal`, so
// every existing registration is unchanged. The shell never branches on entity
// or template key to pick a width — a drawer that needs more room says so in
// its own registration, and the size stays generic Admin presentation.
export type DrawerSize = 'normal' | 'wide' | 'extra-wide';

// A registration may need a different size per mode — a pricing grid needs
// more room in Edit than in a summary View. Keyed by DrawerMode so the shell
// can resolve it once it knows which mode actually rendered; a mode absent
// from the map falls back to `normal`, matching an entirely absent `size`.
export type DrawerSizeByMode = Partial<Record<DrawerMode, DrawerSize>>;

// Registered drawer template keys are open so Stations can register their own
// drawer contracts without changing the coordinator.
export type DrawerTemplateKey = string;

// What the shell hands a template's content: the record identity that drove the
// intent — exactly as the card carried it — plus the active tab and a close
// handle.
//
// The content resolves its own record from that id by matching its OWN native id
// field — the Package Family template compares a string group_id; a numerically
// keyed entity compares its number. `StationRecordId` stays string | number for
// exactly that reason, and no template converts: the id that opened the drawer
// is the id that reads and edits the record.
export interface DrawerContentProps {
  recordId: StationRecordId;
  mode:     DrawerMode;
  onClose:  () => void;
  onModeChange: (mode: DrawerMode) => void;
  // Call after a save that changed the record. It refreshes the wall this drawer
  // was opened from — and only that wall. Content does not know, and must not
  // know, which wall that is: it reports the fact, the controller routes it.
  onSaved:  () => void;
  // Entity-supplied record-level chrome (optional). The shell renders the node
  // passed to `setFooter` in its footer region, and consults the guard passed to
  // `setCloseGuard` before closing from its own chrome (Escape / backdrop / header
  // close). Content that supplies neither behaves exactly as before — the footer
  // region stays absent and the shell closes directly. Module-level footers stay
  // inside the content; only whole-record actions belong here.
  //
  // These two, with `onClose` and `onSaved`, let the shell's content contract
  // satisfy the neutral EntityDrawerHostBridge (close = onClose, setFooter,
  // setCloseGuard, onMutationComplete = onSaved) — so a reusable entity drawer
  // composition can mount here once the shared renderer kit is reachable from this
  // bundle (see docs/code-map/admin-station-drawer.md — the bundle boundary).
  setFooter?:     (footer: ComponentChildren) => void;
  setCloseGuard?: (guard: (() => boolean) | null) => void;
  // Optional: content may publish one node of record-level chrome into the
  // header, immediately beside the shell's own Close ×. For an icon-only
  // action that isn't a whole-record mutation (CRM-1C's Print / Save PDF —
  // Approve/Cancel stay in the footer), the header reads more naturally
  // than a pinned-footer button. The shell resets this to `null` itself
  // whenever the open drawer's content identity changes, the same
  // guaranteed reset `setHeaderHidden` gets below, for the same reason: a
  // header action is shell chrome, not body content a remount naturally
  // clears via effect cleanup. Content that never calls this renders no
  // header action — every existing template is unaffected.
  setHeaderAction?: (action: ComponentChildren) => void;
  // Optional: content may ask the shell to hide its own header (title +
  // close) while an inline module editor already presents its own title,
  // back control, and Cancel/Save — the parent header would be redundant
  // chrome above it. The shell resets this to `false` itself whenever the
  // open drawer's content identity changes, so no content can leave a
  // stale hidden header behind for a different record/drawer. Content that
  // never calls this behaves exactly as before — the header always shows.
  setHeaderHidden?: (hidden: boolean) => void;
}

export type DrawerContent = (props: DrawerContentProps) => import('preact').VNode;

export interface DrawerTemplateRegistration {
  key:            DrawerTemplateKey;
  // Neutral header title, entity-named in data (not by a shell branch).
  title:          string;
  supportedModes: DrawerMode[];
  // Optional declared panel size: one size for every mode, or one size per
  // mode for a drawer whose content needs more room in one mode than another.
  // Omitted, or a mode missing from the map, means `normal`.
  size?:          DrawerSize | DrawerSizeByMode;
  content:        DrawerContent;
}
