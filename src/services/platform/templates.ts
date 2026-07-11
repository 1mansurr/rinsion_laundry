/**
 * services/platform/templates.ts
 *
 * Starting item/service/pricing matrices for provisionLaundry — code
 * constants for v1, not DB-stored (docs/auth_spec.md §5). The platform admin
 * picks one, the provision screen pre-fills the matrix with these prices, and
 * the admin edits cells to the laundry's real prices before submitting —
 * provisionLaundry seeds item_service_prices from the edited copy, not this
 * one directly.
 */

export type TemplateKey = 'general_laundry' | 'dry_cleaner'

export interface TemplateService {
  name: string
  pricingMode: 'per_item' | 'per_kg'
  /** Only for per_kg services */
  kgRate?: { min: number; max: number }
  notes?: string | null
}

export interface TemplatePriceCell {
  itemType: string
  service: string
  min: number
  max: number
  notes?: string | null
}

export interface Template {
  key: TemplateKey
  label: string
  itemTypes: string[]
  services: TemplateService[]
  prices: TemplatePriceCell[]
}

const GENERAL_LAUNDRY: Template = {
  key: 'general_laundry',
  label: 'General Laundry',
  itemTypes: [
    'Shirt', 'Trouser', 'T-Shirt', 'Dress', 'Bedsheet', 'Pillowcase',
    'Towel', 'Duvet / Comforter', 'Jeans', 'Suit (Jacket)',
    'Coat / Blazer', 'Skirt', 'Uniform', 'Curtain',
  ],
  services: [
    { name: 'Wash & Fold', pricingMode: 'per_kg', kgRate: { min: 10, max: 15 } },
    { name: 'Wash & Iron', pricingMode: 'per_item' },
    { name: 'Iron Only', pricingMode: 'per_item' },
  ],
  prices: [
    { itemType: 'Shirt', service: 'Wash & Iron', min: 8, max: 10 },
    { itemType: 'Shirt', service: 'Iron Only', min: 4, max: 5 },
    { itemType: 'Trouser', service: 'Wash & Iron', min: 9, max: 11 },
    { itemType: 'Trouser', service: 'Iron Only', min: 5, max: 6 },
    { itemType: 'T-Shirt', service: 'Wash & Iron', min: 6, max: 8 },
    { itemType: 'T-Shirt', service: 'Iron Only', min: 3, max: 4 },
    { itemType: 'Dress', service: 'Wash & Iron', min: 12, max: 18 },
    { itemType: 'Dress', service: 'Iron Only', min: 7, max: 9 },
    { itemType: 'Bedsheet', service: 'Wash & Iron', min: 15, max: 20 },
    { itemType: 'Bedsheet', service: 'Iron Only', min: 8, max: 10 },
    { itemType: 'Pillowcase', service: 'Wash & Iron', min: 5, max: 6 },
    { itemType: 'Pillowcase', service: 'Iron Only', min: 3, max: 4 },
    { itemType: 'Towel', service: 'Wash & Iron', min: 6, max: 8 },
    { itemType: 'Duvet / Comforter', service: 'Wash & Iron', min: 25, max: 35 },
    { itemType: 'Jeans', service: 'Wash & Iron', min: 10, max: 12 },
    { itemType: 'Jeans', service: 'Iron Only', min: 5, max: 6 },
    { itemType: 'Suit (Jacket)', service: 'Wash & Iron', min: 20, max: 25 },
    { itemType: 'Suit (Jacket)', service: 'Iron Only', min: 10, max: 12 },
    { itemType: 'Coat / Blazer', service: 'Wash & Iron', min: 22, max: 28 },
    { itemType: 'Coat / Blazer', service: 'Iron Only', min: 10, max: 14 },
    { itemType: 'Skirt', service: 'Wash & Iron', min: 9, max: 11 },
    { itemType: 'Skirt', service: 'Iron Only', min: 5, max: 6 },
    { itemType: 'Uniform', service: 'Wash & Iron', min: 12, max: 15 },
    { itemType: 'Uniform', service: 'Iron Only', min: 6, max: 8 },
    { itemType: 'Curtain', service: 'Wash & Iron', min: 20, max: 30 },
  ],
}

const DRY_CLEANER: Template = {
  key: 'dry_cleaner',
  label: 'Dry Cleaner',
  itemTypes: ['Suit (Jacket)', 'Coat / Blazer', 'Dress', 'Trouser', 'Skirt', 'Shirt'],
  services: [
    { name: 'Dry Clean', pricingMode: 'per_item' },
    { name: 'Press Only', pricingMode: 'per_item' },
  ],
  prices: [
    { itemType: 'Suit (Jacket)', service: 'Dry Clean', min: 35, max: 45 },
    { itemType: 'Suit (Jacket)', service: 'Press Only', min: 12, max: 15 },
    { itemType: 'Coat / Blazer', service: 'Dry Clean', min: 40, max: 55 },
    { itemType: 'Coat / Blazer', service: 'Press Only', min: 15, max: 18 },
    { itemType: 'Dress', service: 'Dry Clean', min: 30, max: 45 },
    { itemType: 'Dress', service: 'Press Only', min: 12, max: 16 },
    { itemType: 'Trouser', service: 'Dry Clean', min: 18, max: 22 },
    { itemType: 'Trouser', service: 'Press Only', min: 8, max: 10 },
    { itemType: 'Skirt', service: 'Dry Clean', min: 18, max: 22 },
    { itemType: 'Skirt', service: 'Press Only', min: 8, max: 10 },
    { itemType: 'Shirt', service: 'Dry Clean', min: 12, max: 15 },
    { itemType: 'Shirt', service: 'Press Only', min: 6, max: 8 },
  ],
}

export const TEMPLATES: Record<TemplateKey, Template> = {
  general_laundry: GENERAL_LAUNDRY,
  dry_cleaner: DRY_CLEANER,
}
