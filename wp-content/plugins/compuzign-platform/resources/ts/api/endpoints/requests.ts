import { apiClient } from '../client';
import type { CartItem } from '@/components/cost-builder/types';

export interface SubmitRequestPayload {
  type: 'quote_cart';
  company: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
  items: CartItem[];
  quote_ref: string;
}

export interface SubmitRequestResponse {
  success: boolean;
  quote_id: string;
  message: string;
}

export function submitRequest(payload: SubmitRequestPayload): Promise<SubmitRequestResponse> {
  return apiClient.post<SubmitRequestResponse>('requests/submit', payload);
}

export interface SubmitAssessmentPayload {
  type: 'free_it_assessment';
  contact: string;
  email: string;
  company: string;
  category: string;
  phone: string;
  notes: string;
  quote_ref: string;
}

export function submitAssessment(payload: SubmitAssessmentPayload): Promise<SubmitRequestResponse> {
  return apiClient.post<SubmitRequestResponse>('requests/submit', { ...payload, items: [] });
}

/**
 * Phase 8J-C1's read-boundary shape (QuoteViewAccess::RETURNED_FIELDS) —
 * an explicit allow-list from the stored submission snapshot, never the
 * raw payload. `notes`/`category` are deliberately absent: the accepted
 * QuoteProposalPreview rendering never shows them.
 */
export interface QuoteViewData {
  quote_ref: string;
  type: string;
  contact: string;
  company: string;
  email: string;
  phone: string;
  submitted: string;
  items: CartItem[];
}

export interface QuoteViewResponse {
  success: boolean;
  quote: QuoteViewData;
}

/**
 * Phase 8J-C2: the secret travels only as a header, never a query
 * parameter — see QuoteViewApp.tsx for where `secret` comes from (the URL
 * fragment, never persisted to storage).
 */
export function getQuoteView(ref: string, secret: string): Promise<QuoteViewResponse> {
  return apiClient.get<QuoteViewResponse>(`requests/quote/${encodeURIComponent(ref)}`, {
    'X-Quote-View-Secret': secret,
  });
}
