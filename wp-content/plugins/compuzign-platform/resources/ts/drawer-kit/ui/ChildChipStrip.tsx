// Child/subsection navigation strip (UI refinement, Phase 3).
//
// The smallest shared primitive for a group whose own content is further
// split into child records/subsections — e.g. Tier Options' own Editions
// (Nath, Edition 2, Edition 3…). A subordinate sibling of DrawerGroupTabs
// (the top-level Details/Options/Connections/Support bar), never a second
// top-level tab system: same token family (`--admin-radius`, `--station-*`
// accent/text tokens) as `.cz-drawer-groups__tab`, but visibly smaller and a
// pill/filled active state rather than the top bar's underline, so it always
// reads as one level below the group nav it sits under. Left-aligned,
// horizontally scrollable with no visible scrollbar (mouse/trackpad/touch
// scrolling still works — see `.cz-drawer-groups__chip-strip` in
// drawer-kit.css), and deliberately has no Accordion-specific variant: it
// renders identically regardless of which mode the parent DrawerGroup* is in.
//
// Generic and reusable — the Id type parameter and plain
// `{ id, label }[]` shape carry no Tier/Edition vocabulary — but only Tier
// Edition adopts it today; migrating other groups' own child sections onto
// this primitive is a separate, future decision.

export interface ChildChip<Id extends string = string> {
  id:    Id;
  label: string;
}

export interface ChildChipStripProps<Id extends string = string> {
  chips:     readonly ChildChip<Id>[];
  activeId:  Id | null;
  onSelect:  (id: Id) => void;
  ariaLabel: string;
}

export function ChildChipStrip<Id extends string>({ chips, activeId, onSelect, ariaLabel }: ChildChipStripProps<Id>) {
  return (
    <div class="cz-drawer-groups__chip-strip" role="tablist" aria-label={ariaLabel}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          role="tab"
          aria-selected={activeId === chip.id}
          class={`cz-drawer-groups__chip${activeId === chip.id ? ' cz-drawer-groups__chip--active' : ''}`}
          onClick={() => onSelect(chip.id)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
