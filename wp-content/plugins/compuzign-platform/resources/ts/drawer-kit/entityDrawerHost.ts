// EntityDrawerHostBridge — the neutral seam between a host drawer shell and a
// reusable entity drawer composition (Service, Tier, …).
//
// A composition renders the mature module presentation and owns its own
// module-level edit state and lifecycle dialogs. It reports only host-level
// concerns — the record-level footer, a close-guard, the actual close, and a
// post-mutation refresh — through this bridge, so the SAME composition mounts
// under any host that can satisfy it.
//
// Two hosts can satisfy it:
//   - Old Command Centre: its ActionShell host context — `setFooter`,
//     `setCloseGuard`, `close`, and the `onRefresh` handle map 1:1 here. See
//     ServiceViewStep / ServiceTierStep, now thin adapters over this bridge.
//   - New Admin Station: the generic drawer shell renders the supplied footer,
//     honours the guard, and mounts the same neutral compositions.
//
// It names no host and no entity: contracts cross bundle boundaries, renderers
// do not.

import type { ComponentChildren } from 'preact';

export interface EntityDrawerHostBridge {
  // Ask the host to close the drawer. The composition calls this only once its
  // own close-guard / dialog has cleared (or when it deliberately bypasses the
  // guard for a terminal action), so the host may close unconditionally.
  close: () => void;

  // Publish (or clear, with null) the record-level footer for the host to render
  // in its own footer region. Module-level footers stay inside the content and
  // are never lifted here.
  setFooter: (footer: ComponentChildren) => void;

  // Register (or clear, with null) a close-guard the host consults before
  // closing from its own chrome (Escape / backdrop / header close). Returns true
  // when it is safe to close now; false when the composition has shown its own
  // blocking dialog and will drive the close itself.
  setCloseGuard: (guard: (() => boolean) | null) => void;

  // Ask the host to hide (or restore) its own header — title and close —
  // while a composition's inline module editor already presents its own
  // title, back control, and Cancel/Save, making the host's header redundant
  // chrome above it. Optional: a host or composition that never calls this
  // is unaffected, and the host itself guarantees this never stays stuck
  // hidden when the open drawer's content changes to something else.
  setHeaderHidden?: (hidden: boolean) => void;

  // A save or lifecycle mutation that changed the record completed — the host
  // refreshes the surface the drawer was opened from, and only that surface.
  // Optional: a host with nothing behind the drawer omits it.
  onMutationComplete?: () => void;
}
