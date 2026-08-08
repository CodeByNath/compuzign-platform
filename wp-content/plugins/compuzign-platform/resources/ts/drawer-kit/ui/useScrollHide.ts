// Direction-hysteresis scroll-hide primitive (secondary-nav sticky reveal
// refinement). UI presentation state only — it reads `scrollTop` off an
// explicit container element and returns whether the caller should hide
// itself; it never selects, saves, persists, or calls an endpoint.
//
// Listens on the CALLER-SUPPLIED container, never `window` and never a
// `closest()` lookup of its own — the caller (a drawer composition layer
// that already knows its own DOM shape) resolves which element actually
// scrolls, and WHETHER hide/reveal should be active at all (passing `null`
// disables it entirely — see TierDrawerContent.tsx, which only resolves a
// real container while Tabs mode is active, never in Accordion mode), and
// hands the result in. This hook stays reusable outside any one drawer's
// structure and outside any one view mode's rules.
//
// The one existing scroll-hide pattern in the repo
// (cost-builder/SubcategoryNav.tsx) listens on `window` and flips on every
// single pixel of direction change; this hook deliberately does neither —
// it accumulates delta since the last direction reversal and only reports
// hidden/revealed once that accumulation crosses `thresholdPx`, so small
// trackpad jitter does not flicker it.

import { useEffect, useRef, useState } from 'preact/hooks';

const DEFAULT_THRESHOLD_PX = 12;

export function useScrollHide(container: HTMLElement | null, thresholdPx = DEFAULT_THRESHOLD_PX): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const accumRef = useRef(0);

  useEffect(() => {
    if (!container) {
      setHidden(false);
      return;
    }

    lastYRef.current = container.scrollTop;
    accumRef.current = 0;

    const onScroll = () => {
      const y = container.scrollTop;
      const delta = y - lastYRef.current;
      lastYRef.current = y;

      // A reversal resets the accumulator instead of letting opposite deltas
      // cancel out, so one deliberate change of direction reacts promptly
      // rather than waiting out whatever scroll happened before it.
      if ((delta > 0 && accumRef.current < 0) || (delta < 0 && accumRef.current > 0)) {
        accumRef.current = 0;
      }
      accumRef.current += delta;

      if (accumRef.current > thresholdPx) {
        setHidden(true);
        accumRef.current = thresholdPx;
      } else if (accumRef.current < -thresholdPx) {
        setHidden(false);
        accumRef.current = -thresholdPx;
      }

      // Always visible once scrolled back to the very top of the range.
      if (y <= 0) setHidden(false);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [container, thresholdPx]);

  return hidden;
}
