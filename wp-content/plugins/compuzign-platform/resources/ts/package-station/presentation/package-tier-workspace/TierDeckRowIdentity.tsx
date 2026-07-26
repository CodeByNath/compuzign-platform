// Tier workspace row identity — one icon/name/canonical-reference grammar shared
// by Details, Connections, and Settings rows. Presentation only.

import type { VNode } from 'preact';

interface Props {
  icon: VNode;
  name: string;
  reference: string;
  compact?: boolean;
}

export function TierDeckRowIdentity({ icon, name, reference, compact = false }: Props): VNode {
  return (
    <div class="cz-tier-deck__identity">
      <span
        class={`cz-tier-deck__identity-icon${compact ? ' cz-tier-deck__identity-icon--compact' : ''}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div class="cz-tier-deck__identity-copy">
        <strong class="cz-tier-deck__identity-name">{name}</strong>
        <small class="cz-tier-deck__identity-ref">{reference}</small>
      </div>
    </div>
  );
}
