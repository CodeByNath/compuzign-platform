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

// ── `custom` element payload shapes ──────────────────────────────────────────
// `custom` carries no single bound-value contract (locked, library.ts) — each
// consumer's own payload is one of these small shapes, discriminated by
// `kind` and switched on inside the one `custom` renderer below, rather than
// a second per-consumer renderer map. Not part of the governed element
// vocabulary; extend by adding a `kind` here alongside its render case.

export interface CustomLabelBadgeValue {
  kind: 'label-badge';
  label: string;
  fallback?: string;
  badge: string | null;   // null = no chip rendered
}

export interface CustomPricingRulesValue {
  kind: 'pricing-rules';
  rateSheetTitle: string;
  commitment: string;
  legs: string[];   // pre-labelled leg strings (commercialLegLabel()), in order
}

export interface CustomInclusionRow {
  id: string;
  label: string;
  quantity: number;
  // Set only when there is one resolved price for the whole row (no
  // per-leg assignments apply yet) — never alongside `assignments`.
  priceText?: string | null;
  assignments: Array<{ legLabel: string; priceLabel: string; quantity: number; priceText: string }>;
}

export interface CustomInclusionsValue {
  kind: 'inclusions';
  items: CustomInclusionRow[];
  empty: { title: string; copy: string };
}

export type CustomValue = CustomLabelBadgeValue | CustomPricingRulesValue | CustomInclusionsValue;

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

  // Escape hatch — first real consumers (Amendment Log, library.ts): Tier
  // Overview's Label+Popular-badge row, Tier Pricing Rules' whole-card
  // composition, and Default Tier Inclusions' richer per-item composition
  // (Tier occupant and Tier Edition alike; 2026-08 presentation pass). No
  // single bound-value contract — each consumer's own payload is one of the
  // small `kind`-discriminated shapes below, switched on here rather than
  // registering a second renderer map. Reuses `drawerModule__*`/`cz-ie-*`
  // classes throughout; the inclusions read-card's per-Leg summary (2026-08
  // Tier Inclusions layout pass) adds a small `cz-ie-faq-item__summary*`
  // layout scope in drawer-kit.css rather than a new label typography.
  custom: {
    details: (raw, { loading }) => {
      if (loading) return <p class="drawerModule__value"><Skeleton width="55%" /></p>;
      const v = raw as CustomValue;
      switch (v.kind) {
        case 'label-badge':
          return (
            <p class="drawerModule__value">
              {v.label || v.fallback || ''}
              {v.badge && <span class="cz-tier-workspace__popular-badge">{v.badge}</span>}
            </p>
          );
        case 'pricing-rules':
          return (
            <div class="drawerModule__fields">
              <div class="drawerModule__field" data-field-id="rate-sheet">
                <p class="drawerModule__label">Rate Sheet</p>
                <p class="drawerModule__value">{v.rateSheetTitle}</p>
              </div>
              <div class="drawerModule__field" data-field-id="commitment">
                <p class="drawerModule__label">Commitment</p>
                <p class="drawerModule__value">{v.commitment}</p>
              </div>
              {v.legs.length > 0 ? (
                <>
                  <div class="drawerModule__field" data-field-id="legs-count">
                    <p class="drawerModule__label">Commercial Legs</p>
                    <p class="drawerModule__value">{v.legs.length}</p>
                  </div>
                  {v.legs.map((leg, i) => (
                    <div class="drawerModule__field" data-field-id={`leg-${i + 1}`} key={i}>
                      <p class="drawerModule__label">{`Leg ${i + 1}`}</p>
                      <p class="drawerModule__value">{leg}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div class="drawerModule__field" data-field-id="legs-count">
                  <p class="drawerModule__label">Commercial Legs</p>
                  <p class="drawerModule__value">Not yet configured.</p>
                </div>
              )}
            </div>
          );
        case 'inclusions':
          if (v.items.length === 0) {
            return (
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">{v.empty.title}</p>
                <p class="drawerModule__empty-copy">{v.empty.copy}</p>
              </div>
            );
          }
          return (
            <div class="cz-ie-list">
              {v.items.map((item) => (
                <div key={item.id} class="cz-ie-faq-item">
                  <div class="cz-ie-faq-item__header">
                    <span class="drawerModule__value">{item.label}</span>
                    <div class="cz-ie-faq-item__summary">
                      {item.assignments.length > 0 ? (
                        item.assignments.map((a, idx) => (
                          <div class="cz-ie-faq-item__summary-line" key={idx}>
                            <span class="drawerModule__value drawerModule__value--muted">
                              {`${a.legLabel} · ${a.priceLabel} · Qty ${a.quantity}`}
                            </span>
                            <span class="drawerModule__value drawerModule__value--muted">{a.priceText}</span>
                          </div>
                        ))
                      ) : (
                        <div class="cz-ie-faq-item__summary-line">
                          <span class="drawerModule__value drawerModule__value--muted">{`Qty ${item.quantity}`}</span>
                          {item.priceText && (
                            <span class="drawerModule__value drawerModule__value--muted">{item.priceText}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        default:
          return null;
      }
    },
  },
};

// Fallback Rule (locked): read viewpoints fall back to the `details`
// renderer; `table`, `card`, and `edit` are opt-in only.
const READ_FALLBACK_MODES: ShellMode[] = ['connections', 'summary'];

export function resolveModeRenderer(element: PlatformElementId, mode: ShellMode): ElementModeRenderer | undefined {
  const entry = MODE_RENDERERS[element];
  if (!entry) return undefined;
  return entry[mode] ?? (READ_FALLBACK_MODES.includes(mode) ? entry.details : undefined);
}
