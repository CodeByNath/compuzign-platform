import '../../css/modules/cost-builder.css';
import { registry } from '@/runtime/registry';
import { CostBuilderApp } from '@/components/cost-builder/CostBuilderApp';

registry.register({
  id: 'cost-builder',
  component: CostBuilderApp,
  conditions: [
    { type: 'shortcode', mountId: 'compuzign-cost-builder' },
  ],
});
