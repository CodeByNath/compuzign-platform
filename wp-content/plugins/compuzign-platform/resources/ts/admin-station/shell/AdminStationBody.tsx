// Body — hosts the Admin Station Home shell.
//
// The presentation region now renders the Category Group card grid and nothing
// else: no eyebrow, title, description, status, or actions are supplied, so the
// Home shell omits its framing entirely and the cards are the only content. The
// framing contract itself is untouched and stays available to future stations.
//
// The data is now the real Service Category Group read (Phase 1): the station's
// read hook supplies the cards, their collection state (loading / error), and a
// refetch. The card tree is unchanged — it still receives items and callbacks
// and never fetches. The neutral mock remains only as a standby preview fixture
// (there is no local WordPress runtime) and is no longer wired here.
//
// No groups are supplied. The former placeholder tabs were development
// scaffolding, and a labelled tab is indistinguishable at a glance from a real
// station group — so the region falls to the Home shell's own no-group
// behaviour rather than showing demonstration tabs beside real card content.
// The dynamic tab component is untouched and renders whatever a future station
// hands it; this file simply hands it nothing yet.

import { useCallback } from 'preact/hooks';
import { AdminStationHome } from '../home/AdminStationHome';
import { CategoryGroupCardGrid } from '../presentation/category-groups/CategoryGroupCardGrid';
import { useServiceCategoryGroupCards } from '../stations/serviceCategoryGroup';
import {
  toCategoryGroupDrawerRequest,
  openCategoryGroupDrawer,
} from '../presentation/category-groups/categoryGroupDrawer';
import type { CategoryGroupCardActionEvent } from '../presentation/category-groups/types';

export function AdminStationBody() {
  // Real Service Category Group read: current-scope groups mapped into cards,
  // plus the grid's collection state. Cards stay pure — this hook is the whole
  // data boundary the presentation region reads from.
  const { items, loading, error } = useServiceCategoryGroupCards();

  // The card action seam. Every action arrives carrying the dispatching card's
  // own numeric term_id (and slug key), so the request describes the acted-on
  // card. The drawer it requests does not exist yet — see categoryGroupDrawer.ts,
  // so the numeric identity is prepared and carried, not yet consumed.
  const handleCategoryGroupAction = useCallback((event: CategoryGroupCardActionEvent) => {
    const request = toCategoryGroupDrawerRequest(event);
    if (!request) {
      return;
    }
    openCategoryGroupDrawer(request);
  }, []);

  return (
    <main class="cz-admin-station__body">
      <AdminStationHome
        presentation={{
          content: (
            <CategoryGroupCardGrid
              items={items}
              loading={loading}
              error={error}
              onAction={handleCategoryGroupAction}
            />
          ),
        }}
      />
    </main>
  );
}
