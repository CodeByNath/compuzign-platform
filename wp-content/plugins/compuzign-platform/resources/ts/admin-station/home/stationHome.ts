// Admin Station Home — the shell contract.
//
// This is a station-agnostic template. The Home shell owns layout, active-group
// selection, and accessibility. It owns no station business state and imports no
// station module: everything it renders arrives through the two contracts below.
//
// Navigation selects the active station. AdminStationBody resolves that station's
// ordered presentation composition; an optional group collection is rendered only
// when supplied.

import type { ComponentType, VNode } from 'preact';

// Presentation content for the region at the top of the Home body. Every field
// is optional — the shell renders a neutral empty state when nothing is given,
// and omits any framing (header row) it has no content for.
//
// `eyebrow`, `title`, and `description` are plain text so the shell can place
// them in its own framing. The rest are station-rendered nodes: the shell places
// them without inspecting them.
export interface AdminStationPresentation {
  eyebrow?: string;
  title?: string;
  description?: string;
  status?: VNode;
  actions?: VNode;
  visual?: VNode;
  summary?: VNode;
  content?: VNode;
}

// One entry in the dynamic group-tab collection.
//
// `content` is a VNode — the narrowest form that works here, matching how the
// navigation source already passes `icon` as a component type. The shell renders
// only the active group's content and never inspects it.
export interface AdminStationGroup {
  // Stable identity. Links the tab to its panel and keys the active-group state.
  id: string;
  // Human-readable tab label.
  label: string;
  // Optional glyph, same shape as the Admin Station icon set.
  icon?: ComponentType<{ class?: string }>;
  // The panel body for this group.
  content: VNode;
  // A disabled group keeps its tab but can never become active.
  disabled?: boolean;
}

// Resolve which group is active, derived rather than stored.
//
// Deriving on every render is what keeps the active group correct for free when
// the supplied configuration changes: a requested group that is removed, or that
// becomes disabled, falls back on the next render with no effect to synchronise
// and no stale id left behind.
//
// Returns the requested group when it exists and is enabled, otherwise the first
// enabled group, otherwise null (empty collection, or every group disabled).
export function resolveActiveGroupId(
  groups: AdminStationGroup[],
  requestedId: string | null,
): string | null {
  const requested = groups.find((group) => group.id === requestedId);
  if (requested && !requested.disabled) {
    return requested.id;
  }

  return groups.find((group) => !group.disabled)?.id ?? null;
}
