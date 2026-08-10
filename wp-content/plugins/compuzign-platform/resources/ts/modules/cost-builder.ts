import '../../css/modules/cost-builder.css';
import { registry } from '@/runtime/registry';
import { CostBuilderApp } from '@/components/cost-builder/CostBuilderApp';
import { PackageBuilderApp } from '@/components/package-builder/PackageBuilderApp';

registry.register({
  id: 'cost-builder',
  component: CostBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-cost-builder' },
  ],
});

registry.register({
  id: 'package-builder',
  component: PackageBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-package-builder' },
  ],
});
