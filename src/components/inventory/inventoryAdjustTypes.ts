import { Product, ProductVariant } from "../products/products.model";

/**
 * Represents an adjustment entry for a product variant
 */
export interface AdjustmentVariantEntry {
  id: string;
  variant: ProductVariant | null;
  initialQty: number;
  adjustmentQty: string | number;
  finalQty: number;
  notes: string;
}

/**
 * Represents an adjustment row for a product in the inventory adjustment table
 */
export interface AdjustmentRow {
  id: string;
  product: Product | null;
  variants: ProductVariant[];
  variantEntries: AdjustmentVariantEntry[];
  loadingVariants: boolean;
  initialQty: number;
  adjustmentQty: string | number;
  finalQty: number;
  notes: string;
}

/**
 * Type for tracking validation errors by row/field key
 */
export type RowErrors = { [key: string]: string };

/**
 * Type for tracking search values in product autocomplete fields
 */
export type SearchValues = { [idx: number]: string };

/**
 * Validation result interface
 */
export interface ValidationResult {
  hasErrors: boolean;
  errors: RowErrors;
}

/**
 * Factory function type for creating empty adjustment rows
 */
export type CreateEmptyAdjustmentRowFn = () => AdjustmentRow;

/**
 * Factory function type for creating empty variant entries
 */
export type CreateEmptyVariantEntryFn = () => AdjustmentVariantEntry;

/**
 * Function type for calculating final quantity after adjustment
 */
export type CalculateFinalQuantityFn = (
  initial: number,
  adjustment: string | number
) => number;

/**
 * Function type for checking if a product is already selected
 */
export type IsProductAlreadySelectedFn = (
  productId: string,
  rows: AdjustmentRow[],
  excludeIdx: number
) => boolean;

/**
 * Function type for checking if a variant is already selected
 */
export type IsVariantAlreadySelectedFn = (
  variantId: string,
  rows: AdjustmentRow[],
  currentRowIdx: number,
  currentVariantIdx: number
) => boolean;

/**
 * Function type for generating unique IDs
 */
export type GenerateIdFn = () => string;

/**
 * Function type for filtering products based on search and selection
 */
export type GetFilteredProductsFn = (
  idx: number,
  products: Product[],
  rows: AdjustmentRow[],
  searchValues: SearchValues,
  isProductAlreadySelected: IsProductAlreadySelectedFn
) => Product[];

/**
 * Function type for validating all entries
 */
export type ValidateEntriesFn = (rows: AdjustmentRow[]) => ValidationResult;
