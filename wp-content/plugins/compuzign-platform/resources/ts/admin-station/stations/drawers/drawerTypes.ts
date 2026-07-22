// Drawer contracts — the zero-dependency type module for the drawer axis.
//
// Kept separate from drawerRegistry.tsx so both the registry (which value-imports
// the entity content) and the entity content (which needs only these types) can
// import from here without forming a cycle. Its one import is the shell's
// zero-dependency identity type.

import type { ComponentChildren } from 'preact';
import type { StationRecordId } from '../recordIdentity';

// Opening intent only. The composition always owns Overview / Connections and
// module-level editing; `edit` means open directly into its primary module.
export type DrawerMode = 'view' | 'edit';

// Registered drawer template keys. A string-literal union so a binding and an
// intent can only name a template the registry actually defines. The
// `-create` / `-setup` keys open creation surfaces: they name no existing
// record, so their content ignores the dispatched recordId.
export type DrawerTemplateKey =
  | 'package-family'
  | 'category'
  | 'service'
  | 'tier'
  | 'rate-sheet-row'
  | 'package-family-create'
  | 'rate-sheet-setup'
  | 'rate-sheet-group-create';

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
}

export type DrawerContent = (props: DrawerContentProps) => import('preact').VNode;

export interface DrawerTemplateRegistration {
  key:            DrawerTemplateKey;
  // Neutral header title, entity-named in data (not by a shell branch).
  title:          string;
  supportedModes: DrawerMode[];
  content:        DrawerContent;
}
