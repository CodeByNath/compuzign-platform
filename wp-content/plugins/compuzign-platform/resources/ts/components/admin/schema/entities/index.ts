// Station manifest registry (Schema architecture S4, §9).
//
// One entry per station. Requests keeps its own RequestLifecycle and is out
// of scope for station manifests in v1 (§8); it joins the station
// registry in S5 as { kind: 'component' }.

import type { EntitySchema } from '../types';
import { SERVICE_ENTITY } from './service';
import { TIER_ENTITY } from './tier';
import { CATEGORY_ENTITY } from './category';
import { SERVICE_CATEGORY_GROUP_ENTITY } from './serviceCategoryGroup';

export { SERVICE_ENTITY, TIER_ENTITY, CATEGORY_ENTITY, SERVICE_CATEGORY_GROUP_ENTITY };

export const ENTITIES: Record<string, EntitySchema> = {
  service:        SERVICE_ENTITY,
  tier:           TIER_ENTITY,
  category:       CATEGORY_ENTITY,
  'category-group': SERVICE_CATEGORY_GROUP_ENTITY,
};
