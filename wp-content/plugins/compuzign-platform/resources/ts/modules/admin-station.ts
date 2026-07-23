// Admin Station module entry. Registers the new, independent administration
// environment against its own shortcode mount. It shares nothing with the
// existing `admin` module beyond the runtime registry.
//
// Styles are colocated with the Admin Station source (tokens → base →
// responsive) and imported here so the bundler emits a single stylesheet.

// The shared drawer stylesheet (css/modules/drawer-kit.css) is NOT imported
// here: this environment mounts the same Service/Tier compositions and needs its
// rules, but importing it from two JS entries makes Rollup emit it as a third,
// unenqueued stylesheet. It is its own build entry and arrives as a
// wp_register_style DEPENDENCY of this sheet — which also guarantees it loads
// first, so the station's own chrome still wins any overlap.
import '../admin-station/styles/admin-station-tokens.css';
import '../admin-station/styles/admin-station.css';
import '../admin-station/styles/admin-station-responsive.css';

import { registry } from '@/runtime/registry';
import { AdminStation } from '@/admin-station/AdminStation';
import { registerAdminStation, registerPresentationPolicy } from '@/admin-station/register';
import { registerPackageStation } from '@/package-station/register';
import { registerServiceStation } from '@/service-station/register';
import { finalizeStationRegistry } from '@/station-manager/registry/boot';

registerServiceStation();
registerPackageStation();
registerAdminStation();
registerPresentationPolicy();
finalizeStationRegistry();

registry.register({
  id: 'admin-station',
  component: AdminStation,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-admin-station' },
  ],
});
