import { Product } from "../products/products.model";
import {
  AdjustmentRow,
  AdjustmentVariantEntry,
  SearchValues,
  IsProductAlreadySelectedFn,
} from "./inventoryAdjustTypes";

/**
 * Generates a unique ID for rows and entries
 * @returns Random unique ID string
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Creates an empty adjustment row with default values
 * @returns New empty adjustment row
 */
export const createEmptyAdjustmentRow = (): AdjustmentRow => ({
  id: generateId(),
  product: null,
  variants: [],
  variantEntries: [],
  loadingVariants: false,
  initialQty: 0,
  adjustmentQty: "",
  finalQty: 0,
  notes: "",
});

/**
 * Creates an empty variant entry with default values
 * @returns New empty variant entry
 */
export const createEmptyVariantEntry = (): AdjustmentVariantEntry => ({
  id: generateId(),
  variant: null,
  initialQty: 0,
  adjustmentQty: "",
  finalQty: 0,
  notes: "",
});

/**
 * Calculates final quantity after applying adjustment
 * @param initial Initial quantity
 * @param adjustment Adjustment quantity (can be string or number)
 * @returns Final quantity after adjustment
 */
export const calculateFinalQuantity = (
  initial: number,
  adjustment: string | number
): number => {
  const adjustmentNum = Number(adjustment) || 0;
  return initial + adjustmentNum;
};

/**
 * Filters products based on search criteria and excludes already selected products
 * @param idx Index of current row
 * @param products Array of all available products
 * @param rows Array of current adjustment rows
 * @param searchValues Object with search values by row index
 * @param isProductAlreadySelected Function to check if product is already selected
 * @returns Filtered array of selectable products
 */
export const getFilteredProducts = (
  idx: number,
  products: Product[],
  rows: AdjustmentRow[],
  searchValues: SearchValues,
  isProductAlreadySelected: IsProductAlreadySelectedFn
): Product[] => {
  const searchValue = searchValues[idx] || "";

  // Filter products to avoid duplicates
  const selectableProducts = products.filter((product) => {
    // Defensive validation: ensure product has required properties for UI
    if (!product) {
      console.warn("Null or undefined product found");
      return false;
    }
    if (!product.id) {
      console.warn("Product without ID found:", product);
      return false;
    }
    if (typeof product.name !== "string") {
      console.warn("Product with invalid name found:", {
        id: product.id,
        name: product.name,
        type: typeof product.name,
      });
      return false;
    }

    if (!product.has_variants) {
      return !isProductAlreadySelected(product.id, rows, idx);
    }
    return !rows.some(
      (row, index) => row.product?.id === product.id && index !== idx
    );
  });

  return selectableProducts
    .filter((p) => {
      // Defensive validation: ensure product has required properties for search
      if (!p) {
        console.warn("Null product in filter");
        return false;
      }
      if (typeof p.name !== "string") {
        console.warn("Product with invalid name in search filter:", {
          id: p.id,
          name: p.name,
          type: typeof p.name,
        });
        return false;
      }
      return p.name.toLowerCase().includes(searchValue.toLowerCase());
    })
    .sort((a, b) => {
      // Defensive validation for sorting
      const nameA = a?.name || "";
      const nameB = b?.name || "";
      return nameA.localeCompare(nameB);
    });
};

/**
 * Focuses on the product autocomplete input for a specific row
 * @param rowIndex Index of the row to focus
 */
export const focusProductInput = (rowIndex: number): void => {
  setTimeout(() => {
    const productInput = document.querySelector(
      `#product-autocomplete-${rowIndex}`
    ) as HTMLInputElement;
    if (productInput) {
      productInput.focus();
    }
  }, 100);
};

/**
 * Removes error entries related to a specific row
 * @param errors Current errors object
 * @param rowIdx Row index to remove errors for
 * @returns New errors object without the specified row errors
 */
export const removeRowErrors = <T extends Record<string, string>>(
  errors: T,
  rowIdx: number
): T => {
  const copy = { ...errors };
  delete copy[rowIdx];

  // Remove variant-specific errors for this row
  Object.keys(copy).forEach((key) => {
    if (key.startsWith(`${rowIdx}-variant-`)) {
      delete copy[key];
    }
  });

  return copy;
};

/**
 * Removes error entry for a specific variant
 * @param errors Current errors object
 * @param rowIdx Row index
 * @param variantIdx Variant index
 * @returns New errors object without the specified variant error
 */
export const removeVariantError = <T extends Record<string, string>>(
  errors: T,
  rowIdx: number,
  variantIdx: number
): T => {
  const copy = { ...errors };
  delete copy[`${rowIdx}-variant-${variantIdx}`];
  return copy;
};

/**
 * Sets an error for a specific row or variant
 * @param errors Current errors object
 * @param key Error key (row index or variant key)
 * @param message Error message
 * @returns New errors object with the error set
 */
export const setError = <T extends Record<string, string>>(
  errors: T,
  key: string | number,
  message: string
): T => {
  return { ...errors, [key]: message };
};
