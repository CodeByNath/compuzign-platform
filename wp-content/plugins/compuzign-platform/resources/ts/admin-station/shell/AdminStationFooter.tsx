// Footer — temporarily hosts the authenticated, API-only catalogue seed action.

import { TemporaryServiceCatalogueSeedAction } from '@/temporary-service-catalogue-seed/TemporaryServiceCatalogueSeedAction';

export function AdminStationFooter() {
  return (
    <footer class="cz-admin-station__footer">
      <TemporaryServiceCatalogueSeedAction />
    </footer>
  );
}
