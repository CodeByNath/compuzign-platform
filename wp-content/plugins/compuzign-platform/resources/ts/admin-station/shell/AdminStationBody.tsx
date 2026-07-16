// Body — hosts the Admin Station Home shell.
//
// The placeholders below are neutral development scaffolding, not station
// content: they exist only to prove the Home shell accepts and renders a dynamic
// configuration, and to make layout, overflow, and responsiveness observable. No
// station is connected yet. When the first station arrives it supplies the
// presentation and groups, and this block is deleted — nothing else here changes.

import { AdminStationHome } from '../home/AdminStationHome';
import type { AdminStationGroup, AdminStationPresentation } from '../home/stationHome';

const placeholderPresentation: AdminStationPresentation = {
  eyebrow: 'Placeholder',
  title: 'Presentation region',
  description:
    'Neutral placeholder. A station supplies this region through the Home presentation contract — title, description, visual, summary, metrics, status, actions, or its own content. The framing above holds its place while this area scrolls.',
};

const placeholderGroups: AdminStationGroup[] = [
  {
    id: 'placeholder-one',
    label: 'Placeholder one',
    content: <p>Placeholder group panel. A station supplies this content.</p>,
  },
  {
    id: 'placeholder-two',
    label: 'Placeholder two',
    content: <p>A second placeholder panel, proving the tabs switch content.</p>,
  },
  {
    id: 'placeholder-disabled',
    label: 'Placeholder disabled',
    disabled: true,
    content: <p>Unreachable: a disabled group can never become active.</p>,
  },
];

export function AdminStationBody() {
  return (
    <main class="cz-admin-station__body">
      <AdminStationHome presentation={placeholderPresentation} groups={placeholderGroups} />
    </main>
  );
}
