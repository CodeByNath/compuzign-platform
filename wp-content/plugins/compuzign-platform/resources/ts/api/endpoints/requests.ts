import { apiClient } from '../client';
import type { QuoteItem } from '@/components/cost-builder/types';

export interface SubmitRequestPayload {
  type: 'quote_cart';
  company: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
  items: QuoteItem[];
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
