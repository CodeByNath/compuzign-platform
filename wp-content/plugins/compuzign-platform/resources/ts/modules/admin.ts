// NOTE: the drawer kit's rules were MOVED out of admin.css into
// css/modules/drawer-kit.css so the Admin Station can load them too. It is NOT
// imported here — importing it from two JS entries makes Rollup emit it as a
// third, unenqueued stylesheet. It is its own build entry (dist/css/drawer-kit.css)
// and both pages receive it as a wp_register_style DEPENDENCY, which also fixes
// its load order ahead of this sheet. See Core/AssetLoader.php.
import '../../css/modules/admin.css';
import { registry } from '@/runtime/registry';
import { AdminApp } from '@/components/admin/AdminApp';

registry.register({
  id: 'admin',
  component: AdminApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-admin' },
  ],
});
