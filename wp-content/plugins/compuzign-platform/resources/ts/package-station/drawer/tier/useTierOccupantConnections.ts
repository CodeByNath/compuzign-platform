// Individual Tier occupant drawer — Connections tab data (UI refinement round
// 3, bring-back). The occupant drawer's own Connections group reads the SAME
// canonical Package-owned relationships the Tier Workspace's per-focused-Tier
// Connections lane already reads — Package Family and Tier Group (the parent
// Tier System) — never the retired Service Overview. Rate Sheet/Groups are
// read directly by the caller from the occupant's own already-loaded deck
// (TierDrawerContent already has it); this hook covers only the two
// relationships the drawer has no other source for.
//
// Self-contained, read-only fetch: the occupant drawer can be opened without
// the Workspace's own useTierInstances state in scope (the registered drawer
// contract carries no per-open context beyond recordId/mode), and this
// drawer's own usePackageStation already reloads itself independently of any
// host wall the same way. It derives NO relationship of its own — every row
// comes from the exact pure projectors the Workspace's Connections/Settings
// lanes already call (projectFamilyConnectionRows,
// projectTierGroupConnectionRows) over the exact collections
// useTierInstances already reads (fetchTierInstances/fetchTierAssignments/
// fetchPackageFamilies).
//
// Presentation-only scope note: this hook resolves identity/status data only.
// Rendering it read-only (no View/Edit) is a deliberate choice made at the
// call site — opening a DIFFERENT record's own drawer from inside an
// already-mounted drawer has no existing mechanism anywhere in this codebase
// (the registered drawer contract is entity-agnostic content with no
// cross-drawer navigation capability), so this round does not invent one.

import { useEffect, useState } from 'preact/hooks';
import { fetchPackageFamilies, fetchTierAssignments, fetchTierInstances } from '../../api';
import { resolvePackageFamilyCardStatus } from '../../surface/packageFamily/cardAdapter';
import {
  projectFamilyConnectionRows,
  projectTierGroupConnectionRows,
  type FamilyConnectionRow,
  type TierGroupConnectionRow,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';

export function useTierOccupantConnections(tierInstanceId: string | null): {
  familyRow:     FamilyConnectionRow | null;
  tierGroupRow:  TierGroupConnectionRow | null;
  loading:       boolean;
} {
  const [family, setFamily]         = useState<WorkspaceFamilyScope | null>(null);
  const [tierGroupRow, setTierGroupRow] = useState<TierGroupConnectionRow | null>(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!tierInstanceId) {
      setFamily(null);
      setTierGroupRow(null);
      return;
    }
    setLoading(true);
    Promise.all([fetchTierInstances(), fetchTierAssignments(), fetchPackageFamilies()])
      .then(([instancesRes, assignmentsRes, familiesRes]) => {
        if (cancelled) return;
        const instance = instancesRes.tier_instances.find((candidate) =>
          candidate.tier_instance_id === tierInstanceId,
        ) ?? null;
        setTierGroupRow(projectTierGroupConnectionRows(instance)[0] ?? null);

        const assignment = assignmentsRes.tier_assignments.find((candidate) =>
          candidate.consumer_type === 'package_family' && candidate.tier_instance_id === tierInstanceId,
        );
        const familyItem = assignment
          ? familiesRes.package_category_groups.find((candidate) => candidate.group_id === assignment.consumer_id) ?? null
          : null;
        // Same WorkspaceFamilyScope shape usePackageTierWorkspace.ts builds
        // from the identical fetchPackageFamilies() collection.
        setFamily(familyItem ? {
          id:          familyItem.group_id,
          name:        familyItem.label,
          description: familyItem.description,
          status:      resolvePackageFamilyCardStatus(familyItem),
          dependents:  familyItem.dependents,
          platformId:  familyItem.platform_id,
        } : null);
      })
      .catch(() => {
        if (cancelled) return;
        setFamily(null);
        setTierGroupRow(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tierInstanceId]);

  return {
    familyRow:    projectFamilyConnectionRows(family)[0] ?? null,
    tierGroupRow,
    loading,
  };
}
