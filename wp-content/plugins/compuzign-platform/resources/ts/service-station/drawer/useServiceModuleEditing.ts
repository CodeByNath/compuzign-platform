// Service module editing — the drawer's module-level edit state machine.
//
// One module edits at a time (null = every module readable); each editor holds a
// draft + original pair for dirty detection, saves through the authoritative
// station callbacks, and clears back to the readable state. Also owns the
// overview editor's category description side-channel (an inline category-owned
// save on top of the overview save) and inline category creation. State and
// callbacks only — no rendering, no endpoint besides the Category-owned calls
// this module always made.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import { createServiceCategory, updateServiceCategory } from '@/api/endpoints/admin';
import type { ServiceStation } from '@/service-station';
import type { OverviewDraft, InclusionsDraft, FaqsDraft } from '@/service-station';
import { initOverviewDraft } from './editors/ServiceOverviewEditor';
import { useAutoDismiss } from '@/entity-drawers/shared/drawerChrome';
import type { ServiceEditingSection } from './serviceDrawerTypes';

// ── Dirty checks — pure, no component state ──────────────────────────────────
function isOverviewDirty(a: OverviewDraft, b: OverviewDraft): boolean {
  return a.title !== b.title || a.excerpt !== b.excerpt ||
         a.content !== b.content || a.category_id !== b.category_id;
}
function isInclusionsDirty(a: InclusionsDraft, b: InclusionsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) => item.id !== b.items[i].id || item.label !== b.items[i].label);
}
function isFaqsDirty(a: FaqsDraft, b: FaqsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) =>
    item.id !== b.items[i].id ||
    item.question !== b.items[i].question ||
    item.answer   !== b.items[i].answer,
  );
}

export interface ServiceModuleEditingArgs {
  // Only consulted as the last-resort Overview seed below, and unreached while
  // pending: a pending station's own `overviewDraft` is never null, so the
  // fallback chain never needs a real ServiceItem for a not-yet-created record.
  service:       ServiceItem | null;
  station:       ServiceStation;
  allCategories: Category[];
  initialEdit?:  boolean;
  // Accordion coordination: opening an editor or completing a save collapses
  // the open notification panel (coordinator-owned state).
  closePanel: () => void;
}

export function useServiceModuleEditing({
  service, station, allCategories, initialEdit, closePanel,
}: ServiceModuleEditingArgs) {
  const {
    detailLoaded,
    inclusions, faqs, overviewDraft: stationOverviewDraft, settledOverview,
    saveOverview, saveInclusions, saveFaqs,
  } = station;

  // Module state machine: null = View, named value = Edit (InlineEditorShell active).
  const [editingSection,   setEditingSection]   = useState<ServiceEditingSection>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  const [catDesc,         setCatDesc]         = useState('');
  const [catDescOriginal, setCatDescOriginal] = useState('');
  const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
  const [overviewOriginal,   setOverviewOriginal]   = useState<OverviewDraft | null>(null);
  const [inclusionsOriginal, setInclusionsOriginal] = useState<InclusionsDraft | null>(null);
  const [faqsOriginal,       setFaqsOriginal]       = useState<FaqsDraft | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);

  const isEditorDirty =
    (editingSection === 'overview'   && overviewDraft   != null && overviewOriginal   != null && isOverviewDirty(overviewDraft, overviewOriginal))   ||
    (editingSection === 'inclusions' && inclusionsDraft != null && inclusionsOriginal != null && isInclusionsDirty(inclusionsDraft, inclusionsOriginal)) ||
    (editingSection === 'faqs'       && faqsDraft       != null && faqsOriginal       != null && isFaqsDirty(faqsDraft, faqsOriginal));

  const editingSectionLabel =
    editingSection === 'overview'   ? 'Service Overview'  :
    editingSection === 'inclusions' ? 'Included Features' :
    editingSection === 'faqs'       ? 'Common Questions'  : null;

  // ── Editor open/close ───────────────────────────────────────────────────────
  const openOverviewEditor = useCallback(() => {
    const wc = stationOverviewDraft;
    let draft: OverviewDraft;
    if (wc) {
      draft = { title: wc.title, excerpt: wc.excerpt, content: wc.content, category_id: wc.category_ids[0] ?? null };
    } else if (settledOverview) {
      draft = { title: settledOverview.title, excerpt: settledOverview.excerpt, content: settledOverview.content, category_id: settledOverview.categories[0]?.id ?? null };
    } else {
      draft = service ? initOverviewDraft(service) : { title: '', excerpt: '', content: '', category_id: null };
    }
    const catId = draft.category_id;
    const desc  = catId ? (localCategories.find(c => c.id === catId)?.description ?? '') : '';
    setCatDesc(desc);
    setCatDescOriginal(desc);
    setOverviewOriginal(draft);
    setOverviewDraft(draft);
    setEditingSection('overview');
    closePanel();
    setSaveErr(null);
  }, [service, stationOverviewDraft, settledOverview, localCategories, closePanel]);

  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || !detailLoaded || initialEditOpened.current) return;
    initialEditOpened.current = true;
    openOverviewEditor();
  }, [initialEdit, detailLoaded, openOverviewEditor]);

  const openInclusionsEditor = useCallback(() => {
    const draft: InclusionsDraft = { items: inclusions };
    setInclusionsOriginal(draft);
    setInclusionsDraft(draft);
    setEditingSection('inclusions');
    closePanel();
    setSaveErr(null);
  }, [inclusions, closePanel]);

  const openFaqsEditor = useCallback(() => {
    const draft: FaqsDraft = { items: faqs };
    setFaqsOriginal(draft);
    setFaqsDraft(draft);
    setEditingSection('faqs');
    closePanel();
    setSaveErr(null);
  }, [faqs, closePanel]);

  // Return every module to the readable state and clear transient save state.
  // Used by Cancel (which also restores the category description) and by the
  // exit dialogs' discard/save-and-proceed continuations.
  const clearEditState = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    clearEditState();
    setCatDesc(catDescOriginal);
  }, [clearEditState, catDescOriginal]);

  const createInlineCategory = useCallback(async (name: string): Promise<{ category: Category; existing: boolean }> => {
    const result = await createServiceCategory({ name });
    if (!result.success || !result.category) {
      throw new Error(result.message ?? 'Failed to create category.');
    }
    const category: Category = {
      id:          result.category.id,
      name:        result.category.name,
      slug:        result.category.slug,
      description: result.category.description,
    };
    setLocalCategories((current) => current.some((item) => item.id === category.id)
      ? current
      : [...current, category]);
    return { category, existing: result.existing ?? false };
  }, []);

  // ── Saves ───────────────────────────────────────────────────────────────────
  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveOverview(overviewDraft);
      if (overviewDraft.category_id !== null && catDesc.trim() !== catDescOriginal.trim()) {
        await updateServiceCategory(overviewDraft.category_id, { description: catDesc.trim() });
        const savedCatId = overviewDraft.category_id;
        const savedDesc  = catDesc.trim();
        setLocalCategories(prev => prev.map(c => c.id === savedCatId ? { ...c, description: savedDesc } : c));
      }
      setCatDescOriginal(catDesc);
      closePanel();
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [overviewDraft, catDesc, catDescOriginal, saveOverview, closePanel]);

  const handleSaveInclusions = useCallback(async () => {
    if (!inclusionsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveInclusions(inclusionsDraft);
      closePanel();
      setEditingSection(null);
      setInclusionsDraft(null);  setInclusionsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [inclusionsDraft, saveInclusions, closePanel]);

  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveFaqs(faqsDraft);
      closePanel();
      setEditingSection(null);
      setFaqsDraft(null);  setFaqsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [faqsDraft, saveFaqs, closePanel]);

  // Save whichever module is open (the exit dialogs' Save-now path); returns the
  // fresh module_status map so the caller can re-check pending state.
  const saveCurrentModule = useCallback(async (): Promise<Record<string, string> | null> => {
    if (editingSection === 'overview'   && overviewDraft)   return saveOverview(overviewDraft);
    if (editingSection === 'inclusions' && inclusionsDraft) return saveInclusions(inclusionsDraft);
    if (editingSection === 'faqs'       && faqsDraft)       return saveFaqs(faqsDraft);
    return null;
  }, [editingSection, overviewDraft, inclusionsDraft, faqsDraft, saveOverview, saveInclusions, saveFaqs]);

  return {
    editingSection, editingSectionLabel, isEditorDirty,
    overviewDraft, setOverviewDraft, inclusionsDraft, setInclusionsDraft, faqsDraft, setFaqsDraft,
    localCategories, catDesc, setCatDesc, createInlineCategory,
    saving, saveErr, setSaveErr, saveOk, setSaveOk,
    openOverviewEditor, openInclusionsEditor, openFaqsEditor,
    handleSaveOverview, handleSaveInclusions, handleSaveFaqs, handleCancelEdit,
    clearEditState, saveCurrentModule,
  };
}

export type ServiceModuleEditing = ReturnType<typeof useServiceModuleEditing>;
