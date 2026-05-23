export type TierId = 'basic' | 'standard' | 'premium' | 'enterprise';

export interface Category {
  id: number | null;
  name: string;
  slug: string;
}

export interface Tier {
  id: TierId;
  title: string;
}

export interface ServiceInclusion {
  id: string;
  label: string;
}

export interface ServiceFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ServiceMeta {
  short_description: string;
  long_description: string;
  billing_cycle: string;
  sla: string;
  uptime: string;
  notes: string;
  popular_tier: TierId | null;
  sort_order: number;
  is_active: boolean;
}

export interface PricingTierData {
  price: number | null;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[]; // transitional compatibility — prefer inclusions
}

export interface ServicePricing {
  tiers: Record<TierId, PricingTierData>;
  bundle: {
    title: string;
    description: string;
    price: number | null;
  };
}

export interface ServiceAvailability {
  is_available: boolean;
  message: string;
}

export interface ServiceItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categories: Category[];
  inclusions: ServiceInclusion[];
  faqs: ServiceFaq[];
  availability: ServiceAvailability;
  meta: ServiceMeta;
  pricing: ServicePricing;
}

export interface ServicesByCategory {
  category_id: number | null;
  category_name: string;
  category_slug: string;
  services: ServiceItem[];
}

export interface CostBuilderResponse {
  categories: Category[];
  tiers: Tier[];
  services_by_category: ServicesByCategory[];
}
