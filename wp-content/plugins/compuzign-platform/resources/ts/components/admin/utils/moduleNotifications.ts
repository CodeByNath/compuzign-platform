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
  // excerpt (short description) is disabled from the workflow — no notification fired for missing excerpt.
  if (!c.category) notes.push({ id: 'overview.category.missing', message: 'Category not selected' });
  if (!c.content)  notes.push({ id: 'overview.content.missing',  message: 'Description missing' });

  // When all fields are complete the pill shows full-colour Pending with no numeric badge.
  // The pending-full pill status already communicates readiness; no context note needed.

  return notes;
}

export function getInclusionsNotes(inclusions: ServiceInclusion[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Empty inclusions: return no notes so the pill shows a dim dot (·) rather than
  // a numeric badge. The pending-dim status on the card already communicates this state.
  if (inclusions.length === 0) {
    return notes;
  }

  const unlabelled = inclusions.filter(i => !i.label?.trim()).length;
  if (unlabelled > 0)
    notes.push({
      id:      'inclusions.labels.missing',
      message: `${unlabelled} feature${unlabelled !== 1 ? 's have' : ' has'} no label`,
    });

  // When all labels are present the pill shows full-colour Pending with no numeric badge.

  return notes;
}

export function getFaqsNotes(faqs: ServiceFaq[], ctx: NoteContext): ModuleNote[] {
  const notes: ModuleNote[] = [];

  // Zero FAQs: return no notes so the pill shows a dim dot (·) rather than a numeric
  // badge. Incomplete FAQ items (missing question or answer) still generate numeric notes below.
  if (faqs.length === 0) {
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

  // When all questions and answers are complete the pill shows full-colour Pending with no numeric badge.

  return notes;
}
