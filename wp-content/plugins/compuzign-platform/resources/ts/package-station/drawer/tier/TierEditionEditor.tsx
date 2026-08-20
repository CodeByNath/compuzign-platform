// Edition editor — one shared inline editor for the Edition's single
// consolidated module, presented as two tabs (Overview / Inclusions) over
// the SAME draft/session (drawer refinement blueprint — Edition module
// reuse, approved revision). Tab selection is local presentation state
// only: it never reaches the API, never creates a second draft, and
// switching tabs never fires an endpoint or touches session.onSave/onCancel
// — those stay owned by InlineEditorShell, outside this component entirely.
// Reuses DrawerGroupTabs (the codebase's existing generic {id,label,content}
// tab renderer, already the non-locked sibling of DrawerTabs) rather than a
// third bespoke tab bar.
//
// session.extras.initialTab picks which tab opens — set by whichever card's
// Edit action opened this session (Edition Overview → 'overview', Edition
// Inclusions → 'inclusions'); read once, as local state, and has no
// business meaning of its own.

import { useState } from 'preact/hooks';
import { DrawerGroupTabs } from '@/drawer-kit/ui/DrawerGroupTabs';
import type { DrawerGroup } from '@/drawer-kit/ui/drawerGroups';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { ShellEditSession } from '@/drawer-kit/schema/types';
import type { PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft } from '../../types';
import { TierEditionOverviewSection, TierEditionInclusionsSection } from './TierEditionOverviewFields';

export type TierEditionEditorTab = 'overview' | 'inclusions';

export function TierEditionEditor({ session }: { session: ShellEditSession }) {
  const [tab, setTab] = useState<TierEditionEditorTab>(
    (session.extras?.initialTab as TierEditionEditorTab | undefined) ?? 'overview',
  );
  const draft = session.draft as TierEditionOverviewDraft;
  const onChange = (patch: Partial<TierEditionOverviewDraft>) => session.patch?.(patch);
  const rateSheetOptions = (session.extras?.rateSheetOptions ?? []) as AdminFieldOption[];
  const svc = session.extras?.svc as { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };

  const groups: DrawerGroup<TierEditionEditorTab>[] = [
    {
      id: 'overview', label: 'Overview',
      content: <TierEditionOverviewSection draft={draft} onChange={onChange} />,
    },
    {
      id: 'inclusions', label: 'Inclusions',
      content: <TierEditionInclusionsSection draft={draft} onChange={onChange} rateSheetOptions={rateSheetOptions} svc={svc} />,
    },
  ];

  return <DrawerGroupTabs groups={groups} activeId={tab} onSelect={setTab} />;
}
