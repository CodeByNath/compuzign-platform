import type { QuoteItem } from '@/components/cost-builder/types';
import type { ServiceItem } from '@/api/types/cost-builder';

export type RequestFlowContext =
  | { type: 'quote_cart'; items: QuoteItem[]; services: ServiceItem[] }
  | { type: 'consultation_request'; prefillCategory?: string }
  | { type: 'support_request' };

export interface ContactFormValues {
  company: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
}
