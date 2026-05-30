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
