// Admin Station module entry. Registers the new, independent administration
// environment against its own shortcode mount. It shares nothing with the
// existing `admin` module beyond the runtime registry.
//
// Styles are colocated with the Admin Station source (tokens → base →
// responsive) and imported here so the bundler emits a single stylesheet.

import '../admin-station/styles/admin-station-tokens.css';
import '../admin-station/styles/admin-station.css';
import '../admin-station/styles/admin-station-responsive.css';

import { registry } from '@/runtime/registry';
import { AdminStation } from '@/admin-station/AdminStation';

registry.register({
  id: 'admin-station',
  component: AdminStation,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-admin-station' },
  ],
});
