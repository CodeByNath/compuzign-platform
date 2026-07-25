// Package-owned Tier workspace source. Family mode resolves exactly one Tier
// instance through tier_assignments[]; explicit direct instance management
// remains available for unassigned instances created by the Phase 5 tool.

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import { usePackageStation } from '../../usePackageStation';
import { useTierInstances } from '../tierInstance/useTierInstances';
import type { TierInstancesToolState } from '../tierInstance/useTierInstances';
import { useHostService } from '../tierSurface/useHostService';
import { toTierOccupantCard } from '../tierSurface/tierOccupantCard';
import { resolvePackageFamilyCardStatus } from '../packageFamily/cardAdapter';
import {
  projectResolvedInstanceOccupants,
  resolveFamilyTierAssignment,
  summarizeTierInstance,
  type WorkspaceFamilyScope,
} from './projection';
import {
  buildRateItemCategoryMap,
  projectTierDeck,
  type TierDeck,
} from './deck';

export interface PackageTierWorkspaceTool {
  kind: 'tier-instance-tool';
  tierInstances: TierInstancesToolState;
  families: WorkspaceFamilyScope[];
  selectedFamily: WorkspaceFamilyScope | null;
  assignedInstance: TierInstanceSummary | null;
  workspaceInstance: TierInstanceSummary | null;
  occupants: CategoryGroupCardItem[];
  decks: Record<string, TierDeck>;
  rateSheets: PackageRateSheet[];
  selectFamily: (familyId: string) => void;
  addTierCapability: () => Promise<boolean>;
}

export interface PackageTierWorkspaceResult {
  items:   PackageTierWorkspaceTool[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function usePackageTierWorkspace(): PackageTierWorkspaceResult {
  const tierInstances = useTierInstances();
  const host = useHostService();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [directInstanceId, setDirectInstanceId] = useState<string | null>(null);
  const [pendingCapability, setPendingCapability] = useState<{
    familyId: string;
    instanceId: string;
  } | null>(null);

  const summaries = useMemo(
    () => tierInstances.instances.map(summarizeTierInstance),
    [tierInstances.instances],
  );
  const families = useMemo<WorkspaceFamilyScope[]>(() => tierInstances.families
    .filter((family) => family.platform_status !== 'archived' && family.platform_status !== 'trashed')
    .map((family) => ({
      id: family.group_id,
      name: family.label,
      description: family.description,
      status: resolvePackageFamilyCardStatus(family),
      dependents: family.dependents,
    })), [tierInstances.families]);

  const selectedFamily = useMemo(() => directInstanceId === null
    ? families.find((family) => family.id === selectedFamilyId) ?? families[0] ?? null
    : null, [directInstanceId, families, selectedFamilyId]);
  const assignedInstance = useMemo(() => selectedFamily
    ? resolveFamilyTierAssignment(selectedFamily, tierInstances.assignments, summaries)
    : null, [selectedFamily, summaries, tierInstances.assignments]);
  const directInstance = useMemo(() => directInstanceId
    ? summaries.find((instance) => instance.tier_instance_id === directInstanceId) ?? null
    : null, [directInstanceId, summaries]);
  const workspaceInstance = directInstance ?? assignedInstance;

  const pkg = usePackageStation(
    host.service?.id ?? 0,
    workspaceInstance?.tier_instance_id ?? null,
  );

  const selectFamily = useCallback((familyId: string) => {
    setSelectedFamilyId(familyId);
    setDirectInstanceId(null);
    const family = families.find((candidate) => candidate.id === familyId);
    const resolved = family
      ? resolveFamilyTierAssignment(family, tierInstances.assignments, summaries)
      : null;
    if (resolved) tierInstances.selectInstance(resolved.tier_instance_id);
  }, [families, summaries, tierInstances]);

  const showInstanceScope = useCallback((instanceId: string) => {
    const assignment = tierInstances.assignments.find((item) => item.tier_instance_id === instanceId);
    const family = assignment
      ? families.find((candidate) => candidate.id === assignment.consumer_id) ?? null
      : null;
    if (family) {
      setSelectedFamilyId(family.id);
      setDirectInstanceId(null);
    } else {
      setSelectedFamilyId(null);
      setDirectInstanceId(instanceId);
    }
  }, [families, tierInstances.assignments]);

  const selectInstance = useCallback((instanceId: string) => {
    tierInstances.selectInstance(instanceId);
    showInstanceScope(instanceId);
  }, [showInstanceScope, tierInstances]);

  const createInstanceForTool = useCallback(async (title: string) => {
    const instance = await tierInstances.createInstance(title);
    if (instance) showInstanceScope(instance.tier_instance_id);
    return instance;
  }, [showInstanceScope, tierInstances]);

  const workspaceTierInstances = useMemo<TierInstancesToolState>(() => ({
    ...tierInstances,
    selectInstance,
    createInstance: createInstanceForTool,
  }), [createInstanceForTool, selectInstance, tierInstances]);

  // Align the instance panel once the first Family collection resolves. Later
  // selections are explicit and handled by selectFamily/selectInstance.
  const initialAlignmentDone = useRef(false);
  useEffect(() => {
    if (initialAlignmentDone.current || tierInstances.loading || selectedFamily === null) return;
    initialAlignmentDone.current = true;
    if (tierInstances.openRequestRevision > 0) return;
    if (assignedInstance) tierInstances.selectInstance(assignedInstance.tier_instance_id);
  }, [assignedInstance, selectedFamily, tierInstances]);

  // Package-owned Open Tier tool hand-offs carry their own revision so opening
  // the already-selected instance still restores its Family/direct scope.
  const observedOpenRevision = useRef(0);
  useEffect(() => {
    if (tierInstances.openRequestRevision === observedOpenRevision.current) return;
    observedOpenRevision.current = tierInstances.openRequestRevision;
    const instanceId = tierInstances.selectedInstanceId;
    if (instanceId === null) return;
    showInstanceScope(instanceId);
  }, [showInstanceScope, tierInstances.openRequestRevision, tierInstances.selectedInstanceId]);

  // An explicit assignment made while directly operating an unassigned
  // instance returns the workspace to that Family without changing either peer.
  useEffect(() => {
    if (directInstanceId === null) return;
    const assignment = tierInstances.assignments.find((item) => item.tier_instance_id === directInstanceId);
    const family = assignment
      ? families.find((candidate) => candidate.id === assignment.consumer_id) ?? null
      : null;
    if (family) {
      setSelectedFamilyId(family.id);
      setDirectInstanceId(null);
    }
  }, [directInstanceId, families, tierInstances.assignments]);

  const addTierCapability = useCallback(async (): Promise<boolean> => {
    if (!selectedFamily || assignedInstance) return false;
    let instanceId = pendingCapability?.familyId === selectedFamily.id
      ? pendingCapability.instanceId
      : null;
    if (instanceId === null) {
      const instance = await tierInstances.createInstance(`${selectedFamily.name} Tiers`);
      if (!instance) return false;
      instanceId = instance.tier_instance_id;
      setPendingCapability({ familyId: selectedFamily.id, instanceId });
    }
    const assigned = await tierInstances.assignInstance(instanceId, selectedFamily.id);
    if (assigned) {
      setPendingCapability(null);
      setSelectedFamilyId(selectedFamily.id);
      setDirectInstanceId(null);
    }
    return assigned;
  }, [assignedInstance, pendingCapability, selectedFamily, tierInstances]);

  const model = useMemo<PackageTierWorkspaceTool>(() => {
    const rateSheets = pkg.service?.rate_sheets ?? [];
    const relationships = pkg.service?.package_relationships ?? [];
    const categoryByRateItem = buildRateItemCategoryMap(
      rateSheets.flatMap((sheet) => sheet.items),
      relationships,
    );
    const decks: Record<string, TierDeck> = {};
    const occupants = projectResolvedInstanceOccupants(
      workspaceInstance,
      pkg.tierOccupants.map(({ occupantId, slotId }) => {
        const view = pkg.tierView(slotId);
        decks[occupantId] = projectTierDeck(
          view?.detail.rate_sheet_selections ?? [],
          categoryByRateItem,
          rateSheets.find((sheet) => sheet.rate_sheet_id === view?.detail.rate_sheet_id) ?? null,
        );
        return toTierOccupantCard({
          occupantId,
          slotId,
          view,
          platformStatus: pkg.platformStatus,
        });
      }),
    );
    return {
      kind: 'tier-instance-tool',
      tierInstances: workspaceTierInstances,
      families,
      selectedFamily,
      assignedInstance,
      workspaceInstance,
      occupants,
      decks,
      rateSheets,
      selectFamily,
      addTierCapability,
    };
  }, [
    assignedInstance,
    families,
    pkg.service,
    pkg.tierOccupants,
    pkg.tierView,
    pkg.platformStatus,
    pkg.detailLoaded,
    selectFamily,
    selectedFamily,
    workspaceInstance,
    workspaceTierInstances,
    addTierCapability,
  ]);

  const waitingForInstance = workspaceInstance !== null && !!host.service && !pkg.detailLoaded;
  return {
    items: [model],
    loading: tierInstances.loading || host.loading || waitingForInstance,
    error: tierInstances.error ?? host.error,
    refetch: () => {
      tierInstances.refetch();
      pkg.refetch();
    },
  };
}
