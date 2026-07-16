// Body — hosts the Admin Station Home shell.
//
// The presentation region now renders the Category Group card grid and nothing
// else: no eyebrow, title, description, status, or actions are supplied, so the
// Home shell omits its framing entirely and the cards are the only content. The
// framing contract itself is untouched and stays available to future stations.
//
// The data is a temporary neutral mock (see mockCategoryGroups) — no real
// Category Station is connected. Swapping in the station's read replaces the
// items passed here and changes nothing in the card tree.
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
import { mockCategoryGroupCards } from '../presentation/category-groups/mockCategoryGroups';
import {
  toCategoryGroupDrawerRequest,
  openCategoryGroupDrawer,
} from '../presentation/category-groups/categoryGroupDrawer';
import type { CategoryGroupCardActionEvent } from '../presentation/category-groups/types';

export function AdminStationBody() {
  // The card action seam. Every action arrives carrying the dispatching card's
  // own id/key, so the request describes the acted-on card and never the sample.
  // The drawer it requests does not exist yet — see categoryGroupDrawer.ts.
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
              items={mockCategoryGroupCards}
              onAction={handleCategoryGroupAction}
            />
          ),
        }}
      />
    </main>
  );
}
