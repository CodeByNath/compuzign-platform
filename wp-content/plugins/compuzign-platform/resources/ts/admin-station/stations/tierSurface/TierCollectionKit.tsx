import type { VNode } from 'preact';
import { CategoryGroupCardGrid } from '../../presentation/category-groups/CategoryGroupCardGrid';
import type { TemplateKitProps } from '../../presentation/templateKits';
import type { TierCollectionItem, TierCollectionMeta } from './tierCollectionTypes';

export function TierCollectionKit({
  items,
  loading,
  error,
  meta,
  onIntent,
}: TemplateKitProps): VNode {
  const tiers = items as TierCollectionItem[];
  const tierMeta = meta as TierCollectionMeta | undefined;

  if (loading) return <p class="cz-station-empty" aria-busy="true">Loading…</p>;
  if (error) return <p class="cz-station-empty" role="alert">{error}</p>;

  if (tiers.length === 0) {
    return (
      <div class="cz-station-empty">
        <p>{tierMeta?.emptyMessage ?? 'No tiers configured'}</p>
        {tierMeta?.createContext && (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={() => onIntent(
              tierMeta.createRecordId,
              'create',
              tierMeta.createContext ?? undefined,
            )}
          >
            {tierMeta.createLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <CategoryGroupCardGrid
      items={tiers}
      loading={false}
      error={null}
      onAction={(event) => {
        const tier = tiers.find((item) => item.id === event.cardId);
        if (tier) onIntent(event.cardId, event.actionId, tier.context);
      }}
    />
  );
}
