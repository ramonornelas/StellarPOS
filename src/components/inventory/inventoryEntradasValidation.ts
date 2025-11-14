import {
  EntradaRow,
  VariantEntry,
  ValidationResult,
  ValidationErrors,
} from "./inventoryEntradasTypes";
import { Product } from "../products/products.model";

/**
 * Validates the quantity input value
 */
export const validateQuantity = (
  value: string | number | null | undefined
): { isValid: boolean; numValue?: number } => {
  if (value === "" || value === null || value === undefined) {
    return { isValid: false };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false };
  }

  return { isValid: true, numValue: num };
};

/**
 * Validates a single row for products without variants
 */
export const validateProductRow = (
  row: EntradaRow,
  index: number
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!row.product) {
    errors[index] = "Selecciona un producto";
  }

  const qtyValidation = validateQuantity(row.addedQty);
  if (!qtyValidation.isValid) {
    errors[index] = "Ingresa una cantidad válida mayor a 0";
  } else if (qtyValidation.numValue === 0) {
    errors[index] = "Ingresa una cantidad válida mayor a 0";
  }

  return errors;
};

/**
 * Validates a single variant entry
 */
export const validateVariantEntry = (
  entry: VariantEntry,
  rowIndex: number,
  variantIndex: number
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!entry.variant) {
    errors[`${rowIndex}-variant-${variantIndex}`] = "Selecciona una variante";
  }

  const qtyValidation = validateQuantity(entry.addedQty);
  if (!qtyValidation.isValid) {
    errors[`${rowIndex}-variant-${variantIndex}`] =
      "Ingresa una cantidad válida mayor a 0";
  } else if (qtyValidation.numValue === 0) {
    errors[`${rowIndex}-variant-${variantIndex}`] =
      "Ingresa una cantidad válida mayor a 0";
  }

  return errors;
};

/**
 * Validates all entries in the inventory entradas form
 */
export const validateEntries = (entradas: EntradaRow[]): ValidationResult => {
  const allErrors: ValidationErrors = {};

  // Global validation for duplicate variants
  const globalVariantErrors = validateGlobalVariantDuplicates(entradas);
  Object.assign(allErrors, globalVariantErrors);

  entradas.forEach((row, index) => {
    if (!row.product) {
      allErrors[index] = "Selecciona un producto";
    } else if (row.product.has_variants) {
      // Check if the product has at least one variant entry
      if (!row.variantEntries || row.variantEntries.length === 0) {
        allErrors[index] = "Agrega al menos una variante para este producto";
      } else {
        // Validate variant entries first
        const variantErrors = validateVariantEntries(row, index);
        Object.assign(allErrors, variantErrors);

        // Validate that it has at least one selected variant with valid quantity
        // Only check this if there are no individual variant errors
        const hasVariantErrors = row.variantEntries.some(
          (_, variantIndex) => allErrors[`${index}-variant-${variantIndex}`]
        );

        if (!hasVariantErrors) {
          const hasValidVariant = row.variantEntries.some(
            (ve) => ve.variant && ve.addedQty && Number(ve.addedQty) > 0
          );
          if (!hasValidVariant) {
            allErrors[index] = "Selecciona al menos una variante con cantidad";
          }
        }
      }
    } else {
      // Product without variants
      const qtyValidation = validateQuantity(row.addedQty);
      if (!qtyValidation.isValid) {
        allErrors[index] = "Ingresa una cantidad válida";
      } else if (qtyValidation.numValue === 0) {
        allErrors[index] = "Ingresa una cantidad mayor a 0";
      } else if (qtyValidation.numValue && qtyValidation.numValue < 0) {
        allErrors[index] = "La cantidad no puede ser negativa";
      }
    }
  });

  return {
    hasErrors: Object.keys(allErrors).length > 0,
    errors: allErrors,
  };
};

/**
 * Checks if a product is already selected in the entries
 */
export const isProductAlreadySelected = (
  productId: string,
  entradas: EntradaRow[],
  currentIndex?: number
): boolean => {
  return entradas.some(
    (row, index) => row.product?.id === productId && index !== currentIndex
  );
};

/**
 * Checks if a variant is already selected in the entries
 */
export const isVariantAlreadySelected = (
  variantId: string,
  entradas: EntradaRow[],
  currentRowIndex?: number,
  currentVariantIndex?: number
): boolean => {
  return entradas.some((row, rowIndex) => {
    // Only check within the same product row with variants
    // (since now there can only be one row per product with variants)
    if (rowIndex !== currentRowIndex) {
      return false;
    }

    return row.variantEntries.some(
      (variantEntry, variantIndex) =>
        variantEntry.variant?.id === variantId &&
        variantIndex !== currentVariantIndex
    );
  });
};

/**
 * Creates a new empty entrada row
 */
export const createEmptyEntradaRow = (): EntradaRow => ({
  product: null,
  variants: [],
  loadingVariants: false,
  initialQty: 0,
  addedQty: "",
  finalQty: 0,
  variantEntries: [],
});

/**
 * Creates a new empty variant entry
 */
export const createEmptyVariantEntry = (): VariantEntry => ({
  variant: null,
  initialQty: 0,
  addedQty: "",
  finalQty: 0,
});

/**
 * Calculates the final quantity based on initial and added quantities
 */
export const calculateFinalQuantity = (
  initialQty: number,
  addedQty: number | string
): number => {
  const addedNum =
    typeof addedQty === "string" ? parseFloat(addedQty) || 0 : addedQty;
  return initialQty + addedNum;
};

/**
 * Updates variant entry with calculated final quantity
 */
export const updateVariantEntryQuantity = (
  entry: VariantEntry,
  addedQty: number | string
): VariantEntry => {
  return {
    ...entry,
    addedQty,
    finalQty: calculateFinalQuantity(entry.initialQty, addedQty),
  };
};

/**
 * Updates entrada row with calculated final quantity
 */
export const updateEntradaRowQuantity = (
  row: EntradaRow,
  addedQty: number | string
): EntradaRow => {
  return {
    ...row,
    addedQty,
    finalQty: calculateFinalQuantity(row.initialQty, addedQty),
  };
};

/**
 * Gets selected products and variants for inventory movement
 */
export const getSelectedItemsForMovement = (entradas: EntradaRow[]) => {
  const selectedProductIds: string[] = [];
  const selectedVariantKeys: string[] = [];

  entradas.forEach((row) => {
    if (row.product?.has_variants) {
      row.variantEntries.forEach((variantEntry) => {
        if (variantEntry.variant) {
          selectedVariantKeys.push(
            `${row.product!.id}-${variantEntry.variant.id}`
          );
        }
      });
    } else if (row.product) {
      selectedProductIds.push(row.product.id);
    }
  });

  return { selectedProductIds, selectedVariantKeys };
};

/**
 * Validates for duplicate variants within the same product row
 */
export const validateDuplicateVariants = (
  row: EntradaRow,
  rowIndex: number
): ValidationErrors => {
  const errors: ValidationErrors = {};
  const seenVariants = new Set<string>();

  row.variantEntries.forEach((variantEntry, variantIndex) => {
    if (variantEntry.variant) {
      const variantId = variantEntry.variant.id;
      const errorKey = `${rowIndex}-variant-${variantIndex}`;

      if (seenVariants.has(variantId)) {
        errors[errorKey] =
          "Esta variante ya está seleccionada en este producto";
      } else {
        seenVariants.add(variantId);
      }
    }
  });

  return errors;
};

/**
 * Validates that variant entries have proper selection and quantities
 */
export const validateVariantEntries = (
  row: EntradaRow,
  rowIndex: number
): ValidationErrors => {
  const errors: ValidationErrors = {};

  row.variantEntries.forEach((variantEntry, variantIndex) => {
    const errorKey = `${rowIndex}-variant-${variantIndex}`;

    // Validate variant selection
    if (!variantEntry.variant) {
      errors[errorKey] = "Selecciona una variante";
      return; // If there's no variant, don't validate quantity
    }

    // Validate quantity (only if variant is selected)
    const qtyValidation = validateQuantity(variantEntry.addedQty);
    if (!qtyValidation.isValid) {
      errors[errorKey] = "Ingresa una cantidad válida";
    } else if (qtyValidation.numValue === 0) {
      errors[errorKey] = "Ingresa una cantidad mayor a 0";
    } else if (qtyValidation.numValue && qtyValidation.numValue < 0) {
      errors[errorKey] = "La cantidad no puede ser negativa";
    }
  });

  return errors;
};

/**
 * Validates for duplicate variants across different products (global validation)
 */
export const validateGlobalVariantDuplicates = (
  entradas: EntradaRow[]
): ValidationErrors => {
  const errors: ValidationErrors = {};
  const globalVariantMap = new Map<
    string,
    { rowIndex: number; variantIndex: number }
  >();

  entradas.forEach((row, rowIndex) => {
    if (row.product?.has_variants) {
      row.variantEntries.forEach((variantEntry, variantIndex) => {
        if (variantEntry.variant) {
          const variantKey = `${row.product!.id}-${variantEntry.variant.id}`;
          const errorKey = `${rowIndex}-variant-${variantIndex}`;

          if (globalVariantMap.has(variantKey)) {
            // Mark both entries as duplicated
            const firstOccurrence = globalVariantMap.get(variantKey)!;
            const firstErrorKey = `${firstOccurrence.rowIndex}-variant-${firstOccurrence.variantIndex}`;

            errors[firstErrorKey] = "Esta variante está duplicada";
            errors[errorKey] = "Esta variante está duplicada";
          } else {
            globalVariantMap.set(variantKey, { rowIndex, variantIndex });
          }
        }
      });
    }
  });

  return errors;
};

/**
 * Checks if a product (without variants) is already fully selected in the entries
 */
export const isProductFullySelected = (
  productId: string,
  entradas: EntradaRow[],
  currentIndex?: number
): boolean => {
  return entradas.some(
    (row, index) =>
      row.product?.id === productId &&
      !row.product.has_variants &&
      index !== currentIndex
  );
};

/**
 * Gets a filtered list of products that can be selected for a specific row
 */
export const getSelectableProducts = (
  allProducts: Product[],
  entradas: EntradaRow[],
  currentRowIndex: number
): Product[] => {
  return allProducts.filter((product) => {
    // Defensive validation: ensure product has required properties for UI
    if (!product) {
      console.warn("getSelectableProducts: Null or undefined product found");
      return false;
    }
    if (!product.id) {
      console.warn("getSelectableProducts: Product without ID found:", product);
      return false;
    }
    if (typeof product.name !== "string") {
      console.warn("getSelectableProducts: Product with invalid name:", {
        id: product.id,
        name: product.name,
        type: typeof product.name,
      });
      return false;
    }

    // Exclude combos from inventory management
    if (product.is_combo) {
      return false;
    }

    // If the product has variants, it can only be selected once
    if (product.has_variants) {
      return !entradas.some(
        (row, index) =>
          row.product?.id === product.id && index !== currentRowIndex
      );
    }

    // If the product has no variants, it can only be selected once
    return !isProductFullySelected(product.id, entradas, currentRowIndex);
  });
};

/**
 * Checks if a row should be automatically removed (product with variants but no variant entries)
 */
export const shouldAutoRemoveRow = (row: EntradaRow): boolean => {
  return !!(
    row.product &&
    row.product.has_variants &&
    (!row.variantEntries || row.variantEntries.length === 0)
  );
};
