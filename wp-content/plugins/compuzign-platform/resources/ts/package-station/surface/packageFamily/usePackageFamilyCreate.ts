import { useCallback, useRef, useState } from 'preact/hooks';
import type {
  PackageFamilyItem,
  PackageFamilyMutationResponse,
  TierAssignmentMutationResponse,
  TierInstanceMutationResponse,
  TierInstanceRecord,
} from '../../types';
import { requestTierInstanceOpen } from '../tierInstance/useTierInstances';

export interface PackageFamilyCreateDraft {
  name: string;
  description: string;
}

export interface PackageFamilyCreateCommands {
  createFamily: (draft: PackageFamilyCreateDraft) => Promise<PackageFamilyMutationResponse>;
  createTierInstance: (payload: { title: string }) => Promise<TierInstanceMutationResponse>;
  createTierAssignment: (payload: {
    consumer_type: 'package_family';
    consumer_id: string;
    tier_instance_id: string;
  }) => Promise<TierAssignmentMutationResponse>;
}

export type PackageFamilyCreateStage = 'form' | 'saved' | 'capability-added';
export const PACKAGE_FAMILY_CREATE_ACTIONS: Record<PackageFamilyCreateStage, readonly string[]> = {
  form: [],
  saved: ['not-now', 'add-tier-capability'],
  'capability-added': ['open-tier-tool'],
};
export type AddTierCapabilityResult =
  | { status: 'added'; instance: TierInstanceRecord }
  | { status: 'instance-failed'; message: string }
  | { status: 'assignment-failed'; instance: TierInstanceRecord; message: string };

export async function savePackageFamilyForCreate(
  commands: PackageFamilyCreateCommands,
  draft: PackageFamilyCreateDraft,
): Promise<PackageFamilyItem> {
  const response = await commands.createFamily(draft);
  if (!response.success || !response.group) {
    throw new Error('Could not save the Package Family.');
  }
  return response.group;
}

export async function completePackageFamilyCreate(
  commands: PackageFamilyCreateCommands,
  draft: PackageFamilyCreateDraft,
  onSaved: () => void,
): Promise<PackageFamilyItem> {
  const family = await savePackageFamilyForCreate(commands, draft);
  onSaved();
  return family;
}

/** Two explicit post-save writes. A failed assignment leaves a valid orphan. */
export async function addTierCapabilityAfterSave(
  commands: PackageFamilyCreateCommands,
  family: PackageFamilyItem,
): Promise<AddTierCapabilityResult> {
  let instance: TierInstanceRecord;
  try {
    const response = await commands.createTierInstance({ title: `${family.label} Tiers` });
    if (!response.success || !response.tier_instance) throw new Error('Tier instance creation failed.');
    instance = response.tier_instance;
  } catch (cause) {
    return {
      status: 'instance-failed',
      message: cause instanceof Error ? cause.message : 'Could not create the Tier instance.',
    };
  }

  try {
    const response = await commands.createTierAssignment({
      consumer_type: 'package_family',
      consumer_id: family.group_id,
      tier_instance_id: instance.tier_instance_id,
    });
    if (!response.success) throw new Error('Tier assignment creation failed.');
    return { status: 'added', instance };
  } catch (cause) {
    return {
      status: 'assignment-failed',
      instance,
      message: cause instanceof Error ? cause.message : 'Could not attach the Tier instance.',
    };
  }
}

export function usePackageFamilyCreate(
  commands: PackageFamilyCreateCommands,
  onSaved: () => void,
) {
  const [stage, setStage] = useState<PackageFamilyCreateStage>('form');
  const [family, setFamily] = useState<PackageFamilyItem | null>(null);
  const [instance, setInstance] = useState<TierInstanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveStarted = useRef(false);

  const saveFamily = useCallback(async (draft: PackageFamilyCreateDraft): Promise<boolean> => {
    if (saveStarted.current || saving || stage !== 'form') return false;
    saveStarted.current = true;
    setSaving(true);
    setError(null);
    try {
      const saved = await savePackageFamilyForCreate(commands, draft);
      setFamily(saved);
      setStage('saved');
      onSaved();
      return true;
    } catch (cause) {
      saveStarted.current = false;
      setError(cause instanceof Error ? cause.message : 'Could not save the Package Family.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [commands, onSaved, saving, stage]);

  const addTierCapability = useCallback(async (): Promise<AddTierCapabilityResult | null> => {
    if (!family || saving || stage !== 'saved') return null;
    setSaving(true);
    setError(null);
    try {
      const result: AddTierCapabilityResult = instance
        ? await commands.createTierAssignment({
            consumer_type: 'package_family',
            consumer_id: family.group_id,
            tier_instance_id: instance.tier_instance_id,
          }).then((response) => response.success
            ? { status: 'added' as const, instance }
            : { status: 'assignment-failed' as const, instance, message: 'Tier assignment creation failed.' })
          .catch((cause) => ({
            status: 'assignment-failed' as const,
            instance,
            message: cause instanceof Error ? cause.message : 'Could not attach the Tier instance.',
          }))
        : await addTierCapabilityAfterSave(commands, family);
      if (result.status === 'added') {
        setInstance(result.instance);
        setStage('capability-added');
      } else if (result.status === 'assignment-failed') {
        setInstance(result.instance);
        setError('Tier instance created but not yet attached to this Family. Attach it from the Family’s Capabilities panel.');
      } else {
        setError(`The Package Family is saved. Tier capability was not added: ${result.message}`);
      }
      return result;
    } finally {
      setSaving(false);
    }
  }, [commands, family, instance, saving, stage]);

  const openTierTool = useCallback(() => {
    if (instance) requestTierInstanceOpen(instance.tier_instance_id);
  }, [instance]);

  return {
    stage,
    family,
    instance,
    saving,
    error,
    saveFamily,
    addTierCapability,
    openTierTool,
  };
}
