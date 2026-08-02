// Mirrors src/services/items/getItemTypes.ts, services/getServices.ts, and
// pricing/getPricingMatrix.ts on the website — same duplication reasoning
// as src/types/orders.ts.

export interface ItemType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface LaundryService {
  id: string;
  name: string;
  isActive: boolean;
  pricingMode: 'per_item' | 'per_kg';
  minKgRate: number | null;
  maxKgRate: number | null;
  notes?: string | null;
}

export interface PriceCell {
  id: string;
  itemTypeId: string;
  serviceId: string;
  minPrice: number;
  maxPrice: number;
  isActive: boolean;
}

export interface CustomerListRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  location?: string | null;
}
