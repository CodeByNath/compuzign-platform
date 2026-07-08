// Station manifest registry (Schema architecture S4, §9).
//
// One entry per station. Requests keeps its own RequestLifecycle and is out
// of scope for station manifests in v1 (§8); it joins the workstation
// registry in S5 as { kind: 'component' }.

import type { EntitySchema } from '../types';
import { SERVICE_ENTITY } from './service';
import { TIER_ENTITY } from './tier';
import { PROMOTION_ENTITY } from './promotion';
import { CATEGORY_ENTITY } from './category';

export { SERVICE_ENTITY, TIER_ENTITY, PROMOTION_ENTITY, CATEGORY_ENTITY };

export const ENTITIES: Record<string, EntitySchema> = {
  service:   SERVICE_ENTITY,
  tier:      TIER_ENTITY,
  promotion: PROMOTION_ENTITY,
  category:  CATEGORY_ENTITY,
};
