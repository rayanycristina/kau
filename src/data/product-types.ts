export type ProductStatusFilter = "all" | "active" | "inactive";

export type ProductCost = {
  id: string;
  productId: string;
  unitCost: number;
  effectiveFrom: string;
  createdAt?: string;
};

export type ProductKit = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  name: string;
  sku?: string;
  shortDescription?: string;
  unitName: string;
  imageUrl?: string;
  isActive: boolean;
  currentCost?: number;
  currentCostEffectiveFrom?: string;
  costs?: ProductCost[];
  kits: ProductKit[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProductInput = {
  name: string;
  sku?: string;
  shortDescription?: string;
  unitName: string;
  imageUrl?: string;
  isActive?: boolean;
  initialUnitCost: number | string;
  costEffectiveFrom: string;
};

export type ProductUpdateInput = Omit<ProductInput, "initialUnitCost" | "costEffectiveFrom">;
