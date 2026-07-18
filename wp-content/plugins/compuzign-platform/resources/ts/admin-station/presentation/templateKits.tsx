// Template kit registry — templateKitKey → the presentation kit that loops a
// surface's records.
//
// A kit is pure presentation: it receives a collection (items + loading + error)
// and an intent dispatcher, loops the records, and emits identity-only intents.
// It fetches nothing and owns no data source — the host pairs it with one. This
// is the "template" half of the model: receive records, loop, print, expose
// View/Edit, dispatch the record id.
//
// Kits never branch on entity beyond narrowing their own item type from the
// registry's `unknown` seam (see dataSources.ts). The record identity a kit
// dispatches is the record's OWN id, forwarded exactly as the card carries it.

import type { VNode } from 'preact';
import { CategoryGroupCardGrid } from './category-groups/CategoryGroupCardGrid';
import type { CategoryGroupCardItem } from './category-groups/types';
import type { TemplateKitKey } from '../stations/surfaceBindings';
import type { StationRecordId } from '../stations/recordIdentity';

// The dispatch a kit emits: the acted-on record's native id and the action id
// (matched against the binding's action intents by the host).
export type StationIntentDispatch = (recordId: StationRecordId, intentId: string) => void;

export interface TemplateKitProps {
  items:   unknown[];
  loading: boolean;
  error:   string | null;
  onIntent: StationIntentDispatch;
}

export type TemplateKit = (props: TemplateKitProps) => VNode;

// Category Group cards — the shell's general-purpose card kit. It narrows the
// registry's `unknown[]` to the card contract (the binding guarantees the paired
// source supplies it), renders the existing grid, and forwards each card action
// as an intent carrying that card's own id.
//
// Deliberately NOT one kit per entity: any source whose adapter projects records
// into CategoryGroupCardItem can be bound to this kit, which is why the Package
// Family wall reuses it unchanged. The card already carries loading / error
// props, so this kit is a thin, faithful adapter — not a second grid.
function CategoryGroupCardsKit({ items, loading, error, onIntent }: TemplateKitProps): VNode {
  return (
    <CategoryGroupCardGrid
      items={items as CategoryGroupCardItem[]}
      loading={loading}
      error={error}
      onAction={(event) => onIntent(event.cardId, event.actionId)}
    />
  );
}

export const TEMPLATE_KITS: Record<TemplateKitKey, TemplateKit> = {
  'category-group-cards': CategoryGroupCardsKit,
};
