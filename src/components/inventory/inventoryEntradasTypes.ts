import { Product, ProductVariant } from "../products/products.model";

export interface VariantEntry {
  variant: ProductVariant | null;
  initialQty: number;
  addedQty: number | string;
  finalQty: number;
}

export interface EntradaRow {
  product: Product | null;
  variants: ProductVariant[];
  loadingVariants: boolean;
  // Para productos sin variantes
  initialQty: number;
  addedQty: number | string;
  finalQty: number;
  // Para productos con variantes
  variantEntries: VariantEntry[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationResult {
  hasErrors: boolean;
  errors: ValidationErrors;
}

export interface ProductSelection {
  selectedProductIds: string[];
  selectedVariantKeys: string[];
}
