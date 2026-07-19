// Element × mode renderer registry (Schema architecture S2).
//
// The single home for element presentation: how a Platform Element's bound
// value appears in each viewpoint. No renderer for (element, mode) = the
// element does not appear in that viewpoint. The Fallback Rule (locked) is
// encoded in `resolveModeRenderer`: the `details` renderer is the default
// fallback for the read viewpoints (`connections`, `summary`); `table`,
// `card`, and `edit` are opt-in only.
//
// The bodies below are the S1 view-card bodies verbatim — pixel parity on
// migrated surfaces is a phase guardrail. Every entry ships a per-mode render
// case in scripts/mode-renderer-snapshot.mjs (stress-test finding 7).

import type { ComponentChildren } from 'preact';
import { Skeleton } from '../../ui/Skeleton';
import type { PlatformElementId, ShellMode } from '../types';
import type {
  TextValue,
  RichTextValue,
  TermValue,
  ItemCollectionValue,
  QaCollectionValue,
  RelationSummaryValue,
  MetricsValue,
} from './library';

export interface ElementRenderContext {
  // True while the authoritative station detail is in flight — renderers hold
  // layout with a shimmer instead of flashing handoff-derived values.
  loading: boolean;
}

export type ElementModeRenderer = (value: unknown, ctx: ElementRenderContext) => ComponentChildren;

export const MODE_RENDERERS: Record<PlatformElementId, Partial<Record<ShellMode, ElementModeRenderer>>> = {
  text: {
    details: (raw, { loading }) => {
      const v = raw as TextValue;
      return loading
        ? <p class="drawerModule__value"><Skeleton width="55%" /></p>
        : <p class="drawerModule__value">{v.value || v.fallback || ''}</p>;
    },
  },

  term: {
    details: (raw, { loading }) => {
      const v = raw as TermValue;
      return loading
        ? <p class="drawerModule__value"><Skeleton width="40%" /></p>
        : <p class="drawerModule__value">{v.value}</p>;
    },
  },

  'rich-text': {
    details: (raw, { loading }) => {
      const v = raw as RichTextValue;
      if (loading) {
        return (
          <p class="drawerModule__value">
            <Skeleton width="100%" />
            <Skeleton width="80%" />
          </p>
        );
      }
      return v.value
        ? <p class="drawerModule__value drawerModule__value--clamp">{v.value}</p>
        : <p class="drawerModule__value drawerModule__value--muted">{v.placeholder}</p>;
    },
    // Relational read viewpoint: an empty prose value is a plain read-only
    // statement, not a muted action prompt — the bound placeholder is an
    // owning-workspace concern and does not apply here.
    connections: (raw) => {
      const v = raw as RichTextValue;
      return v.value
        ? <p class="drawerModule__value drawerModule__value--clamp">{v.value}</p>
        : <p class="drawerModule__value">No description provided.</p>;
    },
  },

  'item-collection': {
    details: (raw, { loading }) => {
      const v = raw as ItemCollectionValue;
      if (loading) {
        return (
          <div class="cz-sc-inclusion-pool">
            <Skeleton width="96px" height="26px" />
            <Skeleton width="120px" height="26px" />
            <Skeleton width="80px" height="26px" />
          </div>
        );
      }
      if (v.items.length > 0) {
        return (
          <div class="cz-sc-inclusion-pool">
            {v.items.map((item) => (
              <span key={item.id} class="cz-tf-chip">
                {item.label}
              </span>
            ))}
          </div>
        );
      }
      return (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">{v.empty.title}</p>
          <p class="drawerModule__empty-copy">{v.empty.copy}</p>
        </div>
      );
    },
  },

  'qa-collection': {
    details: (raw, { loading }) => {
      const v = raw as QaCollectionValue;
      if (loading) {
        return (
          <div class="cz-sc-faq-list">
            <div class="cz-sc-faq-item">
              <p class="cz-sc-faq-item__q"><Skeleton width="60%" /></p>
              <p class="cz-sc-faq-item__a"><Skeleton width="90%" /></p>
            </div>
          </div>
        );
      }
      if (v.items.length > 0) {
        return (
          <div class="cz-sc-faq-list">
            {v.items.map((faq) => (
              <div key={faq.id} class="cz-sc-faq-item">
                <p class="cz-sc-faq-item__q">
                  {faq.question.trim() || 'No Question Added'}
                </p>
                {/* Owned answers (string, possibly empty) surface the gap;
                    absent answer relations (undefined) render no line. */}
                {faq.answer !== undefined && (
                  <p class="cz-sc-faq-item__a">
                    {faq.answer.trim() || 'No Answer Added'}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">{v.empty.title}</p>
          <p class="drawerModule__empty-copy">{v.empty.copy}</p>
        </div>
      );
    },
  },

  // Compact child-relation counts — a connections-viewpoint element (its only
  // consumer today is the related-service card's "Includes" line). No details
  // renderer: the owning workspace presents the relations as full child shells.
  'relation-summary': {
    connections: (raw) => {
      const v = raw as RelationSummaryValue;
      return (
        <p class="drawerModule__value">
          {v.relations.map((r) => `${r.count} ${r.label}`).join(' | ')}
        </p>
      );
    },
  },

  // At-a-glance headline + copy — a summary-viewpoint element (the Commercial
  // group's summary blocks). Renders the shared empty-block frame the S1
  // blocks used; no loading variant — the headline/copy are derivable before
  // the authoritative detail resolves, matching the pre-S3a blocks.
  metrics: {
    summary: (raw) => {
      const v = raw as MetricsValue;
      return (
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">{v.headline}</p>
          <p class="drawerModule__empty-copy">{v.copy}</p>
        </div>
      );
    },
  },

  // Escape hatch — no registered renderers until the first real consumer
  // arrives (no speculation before a consumer exists, phase guardrail).
  custom: {},
};

// Fallback Rule (locked): read viewpoints fall back to the `details`
// renderer; `table`, `card`, and `edit` are opt-in only.
const READ_FALLBACK_MODES: ShellMode[] = ['connections', 'summary'];

export function resolveModeRenderer(element: PlatformElementId, mode: ShellMode): ElementModeRenderer | undefined {
  const entry = MODE_RENDERERS[element];
  if (!entry) return undefined;
  return entry[mode] ?? (READ_FALLBACK_MODES.includes(mode) ? entry.details : undefined);
}
