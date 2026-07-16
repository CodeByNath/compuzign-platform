// Station metric block — one compact label/value tile.
//
// The single metric renderer. There is deliberately no Services, Inclusions, or
// Packages component: a card maps its metric data through this one block, so a
// new or renamed metric is a data change and never a structural one.
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
      {Icon && <Icon class="cz-station-metric__icon" />}
      <span class="cz-station-metric__label">{metric.label}</span>
      <span class="cz-station-metric__value">{metric.value}</span>
    </div>
  );
}
