// Inline module notes panel — renders between the module header and module body.
// Opens when the numeric marker in ModuleStatusPill is clicked.
// Plain note list; no severity icons or row colours.

import type { ModuleNote } from '../utils/moduleNotifications';

interface Props {
  notes: ModuleNote[];
  variant?: 'module' | 'station';
}

export function ModuleNotificationPanel({ notes, variant = 'module' }: Props) {
  if (notes.length === 0) return null;

  if (variant === 'station') {
    return (
      <span class="cz-station-status-notifications__list">
        {notes.map((note) => (
          <span key={note.id} class={`is-${note.type}`}>{note.message}</span>
        ))}
      </span>
    );
  }

  return (
    <div class="cz-module-notes">
      {notes.map(note => (
        <p key={note.id} class="cz-module-notes__item">{note.message}</p>
      ))}
    </div>
  );
}
