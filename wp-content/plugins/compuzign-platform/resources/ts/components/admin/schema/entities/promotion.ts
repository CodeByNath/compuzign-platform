// Promotion station manifest (Schema architecture S4, §9).
//
// Travelling-instance participation: promotions are unbounded, id-identified
// instances on the Service-owned Promotion Station; each instance carries its
// own travel state through the engine transitions (C5). Behaviour stays with
// usePromotionStation; everything here references existing presentation assets.

import type { PromotionTier } from '@/api/types/admin';
import {
  promotionOverviewShell,
  promotionFeaturesShell,
  promotionFaqsShell,
} from '../shells/bindings/promotion';
import { serviceOverviewShell } from '../shells/bindings/service';
import type { EntitySchema } from '../types';

export const PROMOTION_ENTITY: EntitySchema = {
  id:    'promotion',
  label: { singular: 'Promotion', plural: 'Promotions' },
  identity: {
    idOf:    (d: PromotionTier) => d.id,
    titleOf: (d: PromotionTier) => d.name || '(unnamed)',
  },

  lifecycle: {
    participation: 'travelling-instance',
    statuses: ['draft', 'active', 'disabled', 'archived', 'trashed'],
  },

  ownership: { parent: 'service', label: 'Service' },

  // Keyed by backend module key (promotion lifecycle endpoints: overview /
  // features / faqs). `service` is the parent station's primary module,
  // registered for the Connections group placement (shared shell object).
  shells: {
    overview: promotionOverviewShell,
    features: promotionFeaturesShell,
    faqs:     promotionFaqsShell,
    service:  serviceOverviewShell,
  },

  // Instance travel actions (engine C5 transitions).
  actions: {
    archive: { id: 'archive', label: 'Archive',       intent: 'secondary' },
    trash:   { id: 'trash',   label: 'Move to Trash', intent: 'danger' },
    restore: { id: 'restore', label: 'Restore',       intent: 'secondary' },
    delete:  {
      id: 'delete', label: 'Delete Permanently', intent: 'danger',
      confirm: { prompt: 'Delete permanently?', confirmLabel: 'Confirm' },
    },
  },

  placements: {
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
        { module: 'features', mode: 'details' },
        { module: 'faqs',     mode: 'details' },
      ],
      connections: [
        { module: 'service', mode: 'connections' },
      ],
    },
    // No table placements: the promotion bin rows share one card list with
    // the live filter (S3b recorded deferral).
  },
};
