import { useEffect, useRef } from 'preact/hooks';
import { getRuntimeConfig } from '@/runtime/config';

export function Hero() {
  const config = getRuntimeConfig();
  const costBuilderUrl = config?.costBuilderUrl ?? '/services/';
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const svg  = root.querySelector<SVGSVGElement>('.cz-hero-orbit__arcs');
    if (!svg) return;

    const arcs   = Array.from(svg.querySelectorAll<SVGPathElement>('.cz-hero-orbit__arc'));
    const dotEl  = svg.querySelector<SVGEllipseElement>('.cz-hero-orbit__signal');
    if (!arcs.length || !dotEl) return;
    const dot = dotEl; // rebind so closures see SVGEllipseElement, not SVGEllipseElement|null

    let raf     = 0;
    let timer   = 0;
    let lastIdx = -1;
    let stopped = false;

    function pickArc(): SVGPathElement {
      let idx: number;
      do { idx = Math.floor(Math.random() * arcs.length); } while (idx === lastIdx);
      lastIdx = idx;
      return arcs[idx];
    }

    function animate() {
      if (stopped) return;
      const arc      = pickArc();
      const len      = arc.getTotalLength();
      const reverse  = Math.random() > 0.5;
      const duration = 2200 + Math.random() * 1200;
      const t0       = performance.now();

      dot.style.opacity = '1';

      function step(now: number) {
        if (stopped) return;
        const progress = Math.min((now - t0) / duration, 1);
        const pt = arc.getPointAtLength(reverse ? len * (1 - progress) : len * progress);
        dot.setAttribute('cx', String(pt.x));
        dot.setAttribute('cy', String(pt.y));

        if (progress < 1) {
          raf = requestAnimationFrame(step);
        } else {
          dot.style.opacity = '0';
          timer = window.setTimeout(animate, 1200 + Math.random() * 2800);
        }
      }

      raf = requestAnimationFrame(step);
    }

    animate();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  return (
    <section class="cz-hero-orbit" ref={rootRef}>
      <div class="cz-hero-orbit__bg" aria-hidden="true">
        <div class="cz-hero-orbit__ambient" />
        <div class="cz-hero-orbit__horizon" />
        <svg
          class="cz-hero-orbit__arcs"
          viewBox="0 0 1600 520"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path class="cz-hero-orbit__arc" d="M -80 500 Q 800 -80 1680 500" />
          <path class="cz-hero-orbit__arc" d="M -160 430 Q 760 120 1760 430" />
          <path class="cz-hero-orbit__arc" d="M 180 520 Q 760 60 1380 520" />
          <ellipse class="cz-hero-orbit__signal" rx="8" ry="1.1" />
        </svg>
      </div>

      <div class="cz-hero-orbit__content cz-container">
        <div class="cz-hero-orbit__left">
          <span class="cz-eyebrow">Technology you can count on</span>
          <h1 class="cz-heading-xl cz-hero-orbit__h1">
            Managed IT Services<br />for Growing Businesses.
          </h1>
          <p class="cz-copy cz-hero-orbit__desc">
            CompuZign is your outsourced IT department, managing, monitoring, and
            securing the technology your business runs on. One partner. One bill.
            No finger-pointing between vendors.
          </p>
          <div class="cz-hero-orbit__actions">
            <a
              href="#assessment"
              class="cz-btn cz-btn-primary"
              onClick={(e: MouseEvent) => {
                const target = document.getElementById('assessment');
                if (target) {
                  e.preventDefault();
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              Book a Free IT Consultation <span aria-hidden="true">→</span>
            </a>
            <a href={costBuilderUrl} class="cz-btn cz-btn-secondary">
              Get a Free IT Assessment
            </a>
          </div>
        </div>

        <div class="cz-hero-orbit__snapshot">
          <div class="cz-hero-orbit__snapshot-top">
            <div>
              <h3 class="cz-hero-orbit__snapshot-title">Managed Operations Snapshot</h3>
              <p class="cz-hero-orbit__snapshot-region">US • Caribbean • Middle East</p>
            </div>
            <div class="cz-hero-orbit__snapshot-status">
              <span class="cz-hero-orbit__snapshot-dot" aria-hidden="true" />
              Protected
            </div>
          </div>
          <div class="cz-hero-orbit__snapshot-grid">
            <div class="cz-hero-orbit__metric">
              <strong>25+</strong>
              <span>Years of IT leadership</span>
            </div>
            <div class="cz-hero-orbit__metric">
              <strong>&lt;15m</strong>
              <span>Average response time</span>
            </div>
            <div class="cz-hero-orbit__metric">
              <strong>99.9%</strong>
              <span>Monitored infrastructure uptime</span>
            </div>
            <div class="cz-hero-orbit__metric">
              <strong>95%+</strong>
              <span>Multi-year client retention</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
