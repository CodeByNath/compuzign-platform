// Inline module notes panel — renders between the module header and module body.
// Opens when the numeric marker in ModuleStatusPill is clicked.
// Plain note list; no severity icons or row colours.

import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';

interface Props {
  notes: ModuleNote[];
}

export function ModuleNotificationPanel({ notes }: Props) {
  if (notes.length === 0) return null;

  return (
    <div class="cz-module-notes">
      {notes.map(note => (
        <p key={note.id} class="cz-module-notes__item">{note.message}</p>
      ))}
    </div>
  );
}
