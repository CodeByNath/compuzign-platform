import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { getRuntimeConfig } from '@/runtime/config';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';

type RowItem =
  | { kind: 'category'; name: string; slug: string; description: string }
  | { kind: 'service'; service: ServiceItem; categorySlug: string };

export function ServicesEditorial() {
  const isDesktop   = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const [focused,   setFocused]   = useState(isDesktop ? 2 : 0);
  const [focusMode, setFocusMode] = useState<'auto' | 'user'>('auto');
  const focusModeRef = useRef<'auto' | 'user'>('auto');
  const listRef      = useRef<HTMLDivElement>(null);

  const config         = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/pricing/';
  // Strip trailing slash so we can safely append query params.
  const pricingBase    = costBuilderUrl.replace(/\/$/, '');

  const { data, loading } = useCostBuilder();

  // Categories fill first; remaining slots filled with shuffled individual services.
  const rows = useMemo<RowItem[] | null>(() => {
    if (!data) return null;
    const groups = data.services_by_category;
    const MAX = 7;

    const catRows: RowItem[] = groups.slice(0, MAX).map((group) => {
      const firstSvc =
        group.services.find((s) => s.availability.is_available) ?? group.services[0];
      const description = firstSvc
        ? decodeHtml(firstSvc.meta.short_description || firstSvc.excerpt)
        : '';
      return { kind: 'category', name: group.category_name, slug: group.category_slug, description };
    });

    if (catRows.length >= MAX) return catRows;

    // Pool: all available services across every category, shuffled.
    const pool: RowItem[] = [];
    for (const group of groups) {
      for (const svc of group.services) {
        if (svc.availability.is_available) {
          pool.push({ kind: 'service', service: svc, categorySlug: group.category_slug });
        }
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return [...catRows, ...pool.slice(0, MAX - catRows.length)];
  }, [data]);

  // Scroll-driven focus — mobile only (≤767px).
  // Above 767px the default (row 03) is kept permanently; no observer runs.
  //
  // Uses viewport position rather than intersectionRatio so focus changes when
  // the current row exits the reading zone (70% of viewport height), not when
  // the next row is almost fully visible.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !rows) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;

    const rowEls = Array.from(
      list.querySelectorAll<HTMLElement>(
        '.cz-home-svc__row:not(.cz-home-svc__row--browse):not(.cz-home-svc__row--skel)',
      ),
    );
    if (rowEls.length === 0) return;

    let rafId: number = 0;

    function computeFocus() {
      rafId = 0;
      if (focusModeRef.current !== 'auto') return;

      const activeY = window.innerHeight * 0.7;

      // First pass: rows whose vertical range straddles the active line.
      let bestIdx = -1;
      let bestDist = Infinity;

      const spanning: { idx: number; dist: number }[] = [];
      rowEls.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - activeY);
        if (rect.top <= activeY && rect.bottom >= activeY) {
          spanning.push({ idx, dist });
        }
      });

      if (spanning.length > 0) {
        // Multiple rows spanning the line — pick the one with center closest to activeY.
        bestIdx = spanning.reduce((a, b) => (a.dist <= b.dist ? a : b)).idx;
      } else {
        // No row spans the line (above or below viewport) — pick closest center.
        rowEls.forEach((el, idx) => {
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const dist = Math.abs(center - activeY);
          if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
        });
      }

      if (bestIdx !== -1) setFocused(bestIdx);
    }

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(computeFocus);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initialise focus for the current scroll position (handles page reload mid-scroll).
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rows]);

  function handleMouseEnter() {
    focusModeRef.current = 'user';
    setFocusMode('user');
  }

  function handleMouseLeave() {
    focusModeRef.current = 'auto';
    setFocusMode('auto');
  }

  return (
    <section class="cz-home-svc" id="services">
      <div class="cz-container">
        <div class="cz-home-svc__header">
          <div class="cz-home-svc__header-left">
            <span class="cz-eyebrow">Our Services</span>
            <h2 class="cz-heading-xl cz-home-svc__heading">
              Everything your business needs.<br />One partner.
            </h2>
          </div>
          <p class="cz-home-svc__intro">
            From infrastructure and help desk support to cybersecurity,
            cloud migration, disaster recovery and fintech automation,
            CompuZign brings critical IT functions together under one
            accountable team.
          </p>
        </div>

        <div
          class="cz-home-svc__list"
          ref={listRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {loading || !rows ? (
            [1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} class="cz-home-svc__row cz-home-svc__row--skel" aria-hidden="true" />
            ))
          ) : (
            rows.map((row, idx) => {
              const href =
                row.kind === 'category'
                  ? `${pricingBase}?category=${row.slug}`
                  : `${pricingBase}?category=${row.categorySlug}&service=${row.service.slug}`;

              const name =
                row.kind === 'category'
                  ? decodeHtml(row.name)
                  : decodeHtml(row.service.title);

              const desc =
                row.kind === 'category'
                  ? row.description
                  : decodeHtml(row.service.meta.short_description || row.service.excerpt);

              const key =
                row.kind === 'category' ? `cat-${row.slug}` : `svc-${row.service.id}`;

              const isFocused = focusMode === 'auto' && focused === idx;

              return (
                <a
                  key={key}
                  class={`cz-home-svc__row${isFocused ? ' cz-home-svc__row--focused' : ''}`}
                  href={href}
                >
                  <div class="cz-home-svc__index">{String(idx + 1).padStart(2, '0')}</div>
                  <div class="cz-home-svc__name">{name}</div>
                  <div class="cz-home-svc__desc">{desc}</div>
                  <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
                </a>
              );
            })
          )}

          <a
            class="cz-home-svc__row cz-home-svc__row--browse"
            href={costBuilderUrl}
          >
            <div class="cz-home-svc__index">
              {rows ? String(rows.length + 1).padStart(2, '0') : '08'}
            </div>
            <div class="cz-home-svc__name">Browse All Services</div>
            <div class="cz-home-svc__desc">
              Explore the full service catalogue and build a transparent estimate in the Cost Builder.
            </div>
            <div class="cz-home-svc__arrow" aria-hidden="true">&rarr;</div>
          </a>
        </div>
      </div>
    </section>
  );
}
