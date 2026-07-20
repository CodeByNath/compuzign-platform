// Package Station Tools / Skills catalogue — the presentation kit.
//
// The Station-level home for the full tool catalogue: which tools the Package
// Station offers, which are real, their owning authority, and how many Families
// use each. It is pure presentation — it receives the projected collection and
// renders it. It dispatches NO intent and performs NO mutation: assignment is
// owned by the Family and edited from a Family's Settings → Tools, so this wall
// only reads and points the reader there.
//
// Future tools (Promotion / Bundle / Campaign) appear here as compact, read-only
// "Coming soon" roadmap rows — declared at Station level ONCE, never repeated
// inside a Family drawer.

import type { VNode } from 'preact';
import type { TemplateKitProps } from '../templateKits';
import type { PackageToolCatalogueItem } from './types';

function AvailableTool({ tool }: { tool: PackageToolCatalogueItem }): VNode {
  const count = tool.assignedFamilyCount;
  return (
    <li class="cz-tool-catalogue__item cz-tool-catalogue__item--available">
      <div class="cz-tool-catalogue__body">
        <div class="cz-tool-catalogue__heading">
          <span class="cz-tool-catalogue__label">{tool.label}</span>
          <span class="cz-tool-catalogue__state cz-tool-catalogue__state--available">Available</span>
        </div>
        <p class="cz-tool-catalogue__desc">{tool.description}</p>
        <dl class="cz-tool-catalogue__meta">
          <div class="cz-tool-catalogue__meta-row">
            <dt>Assigned Families</dt>
            <dd>{count}</dd>
          </div>
          <div class="cz-tool-catalogue__meta-row">
            <dt>Authority</dt>
            <dd>{tool.authority}</dd>
          </div>
        </dl>
        <p class="cz-tool-catalogue__hint">
          {count === 0
            ? 'Not assigned yet. Open a Package Family and use Settings → Tools to activate it there.'
            : `Manage assignments from each Package Family’s Settings → Tools.`}
        </p>
      </div>
    </li>
  );
}

function FutureTool({ tool }: { tool: PackageToolCatalogueItem }): VNode {
  return (
    <li class="cz-tool-catalogue__item cz-tool-catalogue__item--future">
      <div class="cz-tool-catalogue__heading">
        <span class="cz-tool-catalogue__label">{tool.label}</span>
        <span class="cz-tool-catalogue__state cz-tool-catalogue__state--future">Coming soon</span>
      </div>
      {tool.unavailableReason && (
        <p class="cz-tool-catalogue__reason">{tool.unavailableReason}</p>
      )}
    </li>
  );
}

export function PackageToolCatalogue({ items, loading, error }: TemplateKitProps): VNode {
  if (loading) return <p class="cz-station-empty" aria-busy="true">Loading Tools / Skills…</p>;
  if (error) return <p class="cz-station-empty" role="alert">{error}</p>;

  const tools = items as PackageToolCatalogueItem[];
  const available = tools.filter((tool) => tool.available);
  const future = tools.filter((tool) => !tool.available);

  return (
    <div class="cz-tool-catalogue">
      <p class="cz-tool-catalogue__lead">
        Tools extend the Package Station. Each is registered here and activated per Package Family —
        a Family owns which tools it uses, while the tool’s data stays with its own authority.
      </p>

      <ul class="cz-tool-catalogue__list">
        {available.map((tool) => <AvailableTool key={tool.key} tool={tool} />)}
      </ul>

      {future.length > 0 && (
        <div class="cz-tool-catalogue__roadmap">
          <h4 class="cz-tool-catalogue__roadmap-title">On the roadmap</h4>
          <ul class="cz-tool-catalogue__list cz-tool-catalogue__list--future">
            {future.map((tool) => <FutureTool key={tool.key} tool={tool} />)}
          </ul>
        </div>
      )}
    </div>
  );
}
