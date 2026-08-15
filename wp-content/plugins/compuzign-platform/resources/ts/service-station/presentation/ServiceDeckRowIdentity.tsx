// Service deck row identity — the icon/name/reference cell Service Home's own
// list rows use. Structurally mirrors the Package-owned `TierDeckRowIdentity`
// (identity CELL of the shared station list system, presentation only), but is
// its own file under its own class names: Service Home does not import a
// Package presentation component, per the peer-station boundary.

import type { VNode } from 'preact';

interface Props {
  icon: VNode;
  name: string;
  /** The secondary line under the name. Omitted where the row carries the
   *  record's identity in its own Platform ID column instead — the name then
   *  stands alone rather than over an empty line. */
  reference?: string;
}

export function ServiceDeckRowIdentity({ icon, name, reference }: Props): VNode {
  return (
    <div class="cz-station-list__cell cz-service-deck__identity">
      <span class="cz-service-deck__identity-icon" aria-hidden="true">{icon}</span>
      <div class="cz-service-deck__identity-copy">
        <strong class="cz-service-deck__identity-name">{name}</strong>
        {reference !== undefined && <small class="cz-service-deck__identity-ref">{reference}</small>}
      </div>
    </div>
  );
}
