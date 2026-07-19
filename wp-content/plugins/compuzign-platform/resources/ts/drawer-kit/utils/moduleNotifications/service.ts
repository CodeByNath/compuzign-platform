// Service module rules — Service Overview, Included Features, Common Questions.
// Assembled by useServiceStation; rules derive state only and render nothing.

import type { ServiceInclusion, ServiceFaq, ServiceItem } from '@/api/types/cost-builder';
// Targets the station's './types' module, not its public barrel: useServiceStation
// imports this file, so going through the barrel would close a cycle.
import type { OverviewDraftData } from '@/admin-station/stations/service/types';
import {
  checkOverviewCompleteness,
  checkOverviewCompletenessFromDraft,
  resolveOverviewStatus,
} from '../moduleStatus';
import type { ModuleDefinition, ModuleNote, NoteContext } from './shared';
import { evaluateModuleNotes } from './shared';

// Service Overview.
export const overviewModule: ModuleDefinition<{ service: ServiceItem; draft?: OverviewDraftData | null }> = {
  key:                'overview',
  includeDraftInTail: true,
  problems: ({ service, draft }) => {
    const c = draft ? checkOverviewCompletenessFromDraft(draft) : checkOverviewCompleteness(service);
    const out: ModuleNote[] = [];
    if (!c.title)    out.push({ id: 'overview.title.missing',    message: 'Title missing',         type: 'error' });
    // excerpt (short description) is intentionally excluded from the workflow.
    if (!c.category) out.push({ id: 'overview.category.missing', message: 'Category not selected', type: 'error' });
    if (!c.content)  out.push({ id: 'overview.content.missing',  message: 'Description missing',   type: 'error' });
    return out;
  },
  resolveStatus: ({ service, draft }, ctx) =>
    resolveOverviewStatus(service, {
      platformStatus:   ctx.platformStatus,
      moduleTransition: ctx.moduleTransition ?? 'not-configured',
    }, draft),
};

// Included Features (service-level).
export const inclusionsModule: ModuleDefinition<ServiceInclusion[]> = {
  key:                'inclusions',
  includeDraftInTail: true,
  emptyPrompt:        'Edit and add features.',
  isEmpty:            (items) => items.length === 0,
  problems: (items) => {
    const unlabelled = items.filter(i => !i.label?.trim()).length;
    return unlabelled > 0
      ? [{ id: 'inclusions.labels.missing', message: `${unlabelled} feature${unlabelled !== 1 ? 's have' : ' has'} no label`, type: 'error' }]
      : [];
  },
};

// Common Questions (service-level).
export const faqsModule: ModuleDefinition<ServiceFaq[]> = {
  key:                'faqs',
  includeDraftInTail: true,
  emptyPrompt:        'Edit and add questions.',
  isEmpty:            (items) => items.length === 0,
  problems: (items) => {
    const out: ModuleNote[] = [];
    const noQ = items.filter(f => !f.question?.trim()).length;
    const noA = items.filter(f => !f.answer?.trim()).length;
    if (noQ > 0) out.push({ id: 'faqs.question.missing', message: `${noQ} question${noQ !== 1 ? 's are' : ' is'} missing a question`, type: 'error' });
    if (noA > 0) out.push({ id: 'faqs.answer.missing',   message: `${noA} question${noA !== 1 ? 's are' : ' is'} missing an answer`, type: 'error' });
    return out;
  },
};

// ── Backward-compatible generators ────────────────────────────────────────────
// Existing call sites keep their signatures; each delegates to the shared
// engine, so module-notification behaviour has a single source of truth.

export function getOverviewNotes(
  service: ServiceItem,
  ctx: NoteContext,
  draft?: OverviewDraftData | null,
): ModuleNote[] {
  return evaluateModuleNotes(overviewModule, { service, draft }, ctx);
}

export function getInclusionsNotes(inclusions: ServiceInclusion[], ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(inclusionsModule, inclusions, ctx);
}

export function getFaqsNotes(faqs: ServiceFaq[], ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(faqsModule, faqs, ctx);
}
