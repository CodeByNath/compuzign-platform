// Shared drawer group content model (drawer refinement blueprint, Phase 0).
//
// A drawer's body is described once as an ordered list of groups; two
// renderers (DrawerGroupTabs, DrawerGroupAccordion) consume the same array,
// so a drawer never forks its content between presentation modes. This is
// additive and separate from DrawerTabs.tsx, which stays the platform-locked
// two-tab Overview/Connections bar every other drawer renders through.

import type { ComponentChildren } from 'preact';

export interface DrawerGroup<Id extends string = string> {
  id:      Id;
  label:   string;
  content: ComponentChildren;
}

export interface DrawerGroupNavProps<Id extends string = string> {
  groups:   readonly DrawerGroup<Id>[];
  activeId: Id;
  onSelect: (id: Id) => void;
}
