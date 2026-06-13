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
  popular_label: string | null;
  sort_order: number;
  is_active: boolean | null;
}

export interface PricingTierData {
  price: number | null;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[]; // transitional compatibility — prefer inclusions
  label?: string; // admin display-label override; falls back to Tier.title when absent
}

export interface ServicePricing {
  tiers: Record<TierId, PricingTierData>;
  bundle: {
    title: string;
    description: string;
    price: number | null;
  };
}

export interface PromotionOffer {
  id: string;
  name: string;
  headline: string;
  description: string;
  badge: string;
  campaign_label: string;
  price: number | null;
  billing_label: string;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[];
  exclusions: ServiceInclusion[];
  based_on: string | null;
  is_featured: boolean;
  priority: number;
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
  promotion_tiers: PromotionOffer[];
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
