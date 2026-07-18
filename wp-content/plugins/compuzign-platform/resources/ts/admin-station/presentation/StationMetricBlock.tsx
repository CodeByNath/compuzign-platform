// Station metric block — one labelled metric ROW: glyph, label, value.
//
// The single metric renderer. There is deliberately no Services, Inclusions, or
// Packages component: a card maps its metric data through this one block, so a
// new or renamed metric is a data change and never a structural one.
//
// A row rather than a centred tile, so a card reads as a short list of named
// counts that stays legible at one entry and still lines up its values at
// several. The value is pushed to the trailing edge by the layout, so every
// row in a card shares one value column without the block knowing its siblings.
//
// Entity-neutral and structurally typed, so any card contract carrying an
// id/label/value metric can render through it.

import type { ComponentType } from 'preact';

/** Structural shape — any card metric contract satisfies this. */
export interface StationMetric {
  id:    string;
  label: string;
  value: number | string;
  icon?: ComponentType<{ class?: string }>;
}

interface Props {
  metric: StationMetric;
}

export function StationMetricBlock({ metric }: Props) {
  const Icon = metric.icon;

  return (
    <div class="cz-station-metric">
      {Icon && (
        <span class="cz-station-metric__glyph" aria-hidden="true">
          <Icon class="cz-station-metric__icon" />
        </span>
      )}
      <span class="cz-station-metric__label">{metric.label}</span>
      <span class="cz-station-metric__value">{metric.value}</span>
    </div>
  );
}
