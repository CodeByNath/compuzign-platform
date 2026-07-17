// Presentation region — the reusable container at the top of the Home body.
//
// It does not know which station is active. It renders only the presentation it
// is handed, at its natural content height — there is no height ceiling here.
//
// Scroll ownership: the region contributes no scroll of its own. It is part of
// the single page scroll the whole Home body shares (see AdminStationHome).

import type { AdminStationPresentation as Presentation } from './stationHome';

interface Props {
  presentation?: Presentation;
}

export function AdminStationPresentation({ presentation }: Props) {
  const p = presentation ?? {};
  const hasFraming = Boolean(p.eyebrow || p.title || p.status || p.actions);
  const hasContent = Boolean(p.description || p.visual || p.summary || p.content);

  return (
    <section class="cz-station-presentation" aria-label="Station presentation">
      {hasFraming && (
        <div class="cz-station-presentation__header">
          <div class="cz-station-presentation__heading">
            {p.eyebrow && <p class="cz-station-presentation__eyebrow">{p.eyebrow}</p>}
            {p.title && <h2 class="cz-station-presentation__title">{p.title}</h2>}
          </div>
          <div class="cz-station-presentation__framing">
            {p.status}
            {p.actions}
          </div>
        </div>
      )}

      <div class="cz-station-presentation__content">
        {hasContent ? (
          <>
            {p.description && <p class="cz-station-presentation__description">{p.description}</p>}
            {p.visual}
            {p.summary}
            {p.content}
          </>
        ) : (
          !hasFraming && (
            <p class="cz-station-empty">No presentation content has been provided.</p>
          )
        )}
      </div>
    </section>
  );
}
