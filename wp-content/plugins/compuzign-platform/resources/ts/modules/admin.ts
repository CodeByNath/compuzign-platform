import '../../css/modules/admin.css';
import { registry } from '@/runtime/registry';
import { AdminShell } from '@/components/admin/AdminShell';

registry.register({
  id: 'admin',
  component: AdminShell,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-admin' },
  ],
});
