// Tier workspace tab contract.
//
// One accessible selection primitive serves the lower-deck lanes, compact
// category selectors, and nested connection tabs. It owns IDs, roving focus,
// arrow/Home/End movement, and matching tab/panel relationships; callers own the
// selected id and render only domain content.

import { useId, useRef } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { ChevronDownIcon } from '@/admin-station/shell/icons';

export interface TierTabItem<Id extends string> {
  id:       Id;
  label:    string;
  icon?:    VNode;
  summary?: string | null;
}

interface Props<Id extends string> {
  label:       string;
  items:       readonly TierTabItem<Id>[];
  selectedId:  Id;
  onSelect:    (id: Id) => void;
  variant:     'deck' | 'selectors' | 'nested';
  renderPanel: (id: Id) => ComponentChildren;
}

export function TierTabSet<Id extends string>({
  label,
  items,
  selectedId,
  onSelect,
  variant,
  renderPanel,
}: Props<Id>): VNode {
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabListClass = variant === 'selectors'
    ? 'cz-tier-deck__selector-grid'
    : `cz-tier-deck__tabs${variant === 'nested' ? ' cz-tier-deck__tabs--nested' : ''}`;
  const panelClass = variant === 'selectors'
    ? 'cz-tier-deck__connection-panel'
    : variant === 'nested'
      ? 'cz-tier-deck__tabpanel'
      : 'cz-tier-deck__panel';

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(items[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div class={tabListClass} role="tablist" aria-label={label}>
        {items.map((item, index) => {
          const selected = item.id === selectedId;
          const tabId = `${uid}-tab-${item.id}`;
          const panelId = `${uid}-panel-${item.id}`;
          return (
            <button
              key={item.id}
              id={tabId}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              class={variant === 'selectors' ? 'cz-tier-deck__selector-card' : 'cz-tier-deck__tab'}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {variant === 'selectors' ? (
                <>
                  {item.icon && <span class="cz-tier-deck__selector-icon" aria-hidden="true">{item.icon}</span>}
                  <span class="cz-tier-deck__selector-copy">
                    <span class="cz-tier-deck__selector-title">{item.label}</span>
                    {item.summary !== null && item.summary !== undefined && (
                      <span class="cz-tier-deck__selector-summary">{item.summary}</span>
                    )}
                  </span>
                  <span class="cz-tier-deck__selector-chevron" aria-hidden="true"><ChevronDownIcon /></span>
                </>
              ) : item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <div
            key={item.id}
            id={`${uid}-panel-${item.id}`}
            class={panelClass}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${item.id}`}
            hidden={!selected}
          >
            {renderPanel(item.id)}
          </div>
        );
      })}
    </>
  );
}
