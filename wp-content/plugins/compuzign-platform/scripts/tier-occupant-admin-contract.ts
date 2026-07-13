import { deriveTierOccupants, resolveTierOccupantSlot } from '../resources/ts/components/admin/utils/tierOccupants';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier occupant Admin contract: ${message}`);
}

const tiers = {
  basic: { occupant_id: 'occ_stable', label: 'Original label' },
  standard: { occupant_id: null, label: '' },
  premium: { occupant_id: 'occ_premium', label: 'Premium' },
};

const occupants = deriveTierOccupants(tiers);
check(occupants.length === 2, 'empty shells do not render');
check(occupants[0].occupantId === 'occ_stable', 'stored occupant id is card identity');
check(occupants[0].slotId === 'basic', 'occupant retains its internal slot mutation key');
check(resolveTierOccupantSlot(tiers, 'occ_premium') === 'premium', 'occupant id resolves to the correct slot');

const changedContent = deriveTierOccupants({ ...tiers, basic: { ...tiers.basic, label: 'Changed label' } });
check(changedContent[0].occupantId === occupants[0].occupantId, 'card identity survives slot content changes');

const mutationAddress = resolveTierOccupantSlot(tiers, 'occ_stable');
check(mutationAddress === 'basic', 'existing Tier mutations continue to use the slot id');

console.log('Tier occupant Admin contract checks passed.');
