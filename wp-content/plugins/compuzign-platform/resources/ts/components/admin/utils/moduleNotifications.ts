// Module status notes — derived notification layer for ServiceViewStep module cards.
// Each generator produces ModuleNote[] from live data; nothing is persisted.
// Used by ModuleStatusPill (marker count) and ModuleNotificationPanel (note list).

import type { ServiceInclusion, ServiceFaq } from '@/api/types/cost-builder';
import type { OverviewDraftData } from '@/api/types/admin';
import { checkOverviewCompleteness, checkOverviewCompletenessFromDraft } from './moduleStatus';
import type { ServiceItem } from '@/api/types/cost-builder';

export interface ModuleNote {
  id:      string;   // stable dot-path key for React rendering
  message: string;   // human-readable note shown in the panel
}

export interface NoteContext {
  platformStatus:    string;   // 'active' | 'disabled' | 'archived' | 'trashed'
  moduleTransition?: string;   // 'settled' | 'pending' | 'not-configured' | undefined
  hasDraft?:         boolean;  // true when a draft exists for this module
}

export function noteCount(notes: ModuleNote[]): number {
  return notes.length;
}

// ── Per-module generators ─────────────────────────────────────────────────────

export function getOverviewNotes(
  service: ServiceItem,
  ctx: NoteContext,
  draft?: OverviewDraftData | null,
): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Prefer draft completeness when a draft exists.
  const c = draft
    ? checkOverviewCompletenessFromDraft(draft)
    : checkOverviewCompleteness(service);

  if (!c.title)    notes.push({ id: 'overview.title.missing',    message: 'Title missing' });
  if (!c.excerpt)  notes.push({ id: 'overview.excerpt.missing',  message: 'Short description missing' });
  if (!c.category) notes.push({ id: 'overview.category.missing', message: 'Category not selected' });
  if (!c.content)  notes.push({ id: 'overview.content.missing',  message: 'Description missing' });

  // State-context notes only appear when all fields pass.
  if (c.complete) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'overview.platform.inactive', message: 'Waiting for service activation' });
    else if (ctx.hasDraft)
      notes.push({ id: 'overview.module.draft', message: 'Draft saved — settle to publish' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'overview.module.pending', message: 'Changes ready to settle' });
  }

  return notes;
}

export function getInclusionsNotes(inclusions: ServiceInclusion[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  if (inclusions.length === 0) {
    notes.push({ id: 'inclusions.empty', message: 'No features added' });
    return notes;
  }

  const unlabelled = inclusions.filter(i => !i.label?.trim()).length;
  if (unlabelled > 0)
    notes.push({
      id:      'inclusions.labels.missing',
      message: `${unlabelled} feature${unlabelled !== 1 ? 's have' : ' has'} no label`,
    });

  if (unlabelled === 0) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'inclusions.platform.inactive', message: 'Waiting for service activation' });
    else if (ctx.hasDraft)
      notes.push({ id: 'inclusions.module.draft', message: 'Draft saved — settle to publish' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'inclusions.module.pending', message: 'Changes ready to settle' });
  }

  return notes;
}

export function getFaqsNotes(faqs: ServiceFaq[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  if (faqs.length === 0) {
    notes.push({ id: 'faqs.empty', message: 'No questions added' });
    return notes;
  }

  const noQ = faqs.filter(f => !f.question?.trim()).length;
  const noA = faqs.filter(f => !f.answer?.trim()).length;

  if (noQ > 0)
    notes.push({
      id:      'faqs.question.missing',
      message: `${noQ} question${noQ !== 1 ? 's are' : ' is'} missing a question`,
    });
  if (noA > 0)
    notes.push({
      id:      'faqs.answer.missing',
      message: `${noA} question${noA !== 1 ? 's are' : ' is'} missing an answer`,
    });

  if (noQ === 0 && noA === 0) {
    if (ctx.platformStatus !== 'active')
      notes.push({ id: 'faqs.platform.inactive', message: 'Waiting for service activation' });
    else if (ctx.hasDraft)
      notes.push({ id: 'faqs.module.draft', message: 'Draft saved — settle to publish' });
    else if (ctx.moduleTransition === 'pending')
      notes.push({ id: 'faqs.module.pending', message: 'Changes ready to settle' });
  }

  return notes;
}
