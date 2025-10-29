import {
  AdjustmentRow,
  ValidationResult,
  RowErrors,
} from "./inventoryAdjustTypes";

/**
 * Validates all entries in the adjustment rows
 * @param rows Array of adjustment rows to validate
 * @param generalNotes General notes for the adjustment (optional parameter for backward compatibility)
 * @returns Validation result with errors if any
 */
export const validateEntries = (
  rows: AdjustmentRow[],
  generalNotes?: string
): ValidationResult => {
  const errors: RowErrors = {};
  let hasErrors = false;

  // Validate general notes (required)
  if (
    generalNotes !== undefined &&
    (!generalNotes || generalNotes.trim() === "")
  ) {
    errors["generalNotes"] = "Las notas generales son obligatorias.";
    hasErrors = true;
  }

  rows.forEach((row, idx) => {
    if (!row.product) {
      errors[idx] = "Selecciona un producto.";
      hasErrors = true;
      return;
    }

    if (row.product.has_variants) {
      // Validate variant entries
      const validVariantEntries = row.variantEntries.filter(
        (ve) =>
          ve.variant &&
          ve.adjustmentQty !== "" &&
          Number(ve.adjustmentQty) !== 0
      );

      if (validVariantEntries.length === 0) {
        errors[idx] = "Debe tener al menos una variante con ajuste.";
        hasErrors = true;
      }

      row.variantEntries.forEach((variantEntry, variantIdx) => {
        const errorKey = `${idx}-variant-${variantIdx}`;

        // Validate variant selection first
        if (!variantEntry.variant) {
          errors[errorKey] = "Selecciona una variante";
          hasErrors = true;
          return; // If there's no variant, don't validate quantity
        }

        // Validate quantity (only if variant is selected)
        if (variantEntry.adjustmentQty === "") {
          errors[errorKey] = "Ingresa una cantidad de ajuste.";
          hasErrors = true;
        } else if (Number(variantEntry.adjustmentQty) === 0) {
          errors[errorKey] = "Ingresa una cantidad de ajuste diferente de 0.";
          hasErrors = true;
        } else {
          // Validate that negative adjustments don't result in negative stock
          const adjustmentQty = Number(variantEntry.adjustmentQty);
          if (adjustmentQty < 0 && variantEntry.finalQty < 0) {
            errors[errorKey] =
              "El ajuste no puede hacer que el stock sea negativo.";
            hasErrors = true;
          }
        }
      });
    } else {
      // Validate product without variants
      if (row.adjustmentQty === "" || Number(row.adjustmentQty) === 0) {
        errors[idx] = "Ingresa una cantidad de ajuste.";
        hasErrors = true;
      } else {
        // Validate that negative adjustments don't result in negative stock
        const adjustmentQty = Number(row.adjustmentQty);
        if (adjustmentQty < 0 && row.finalQty < 0) {
          errors[idx] = "El ajuste no puede hacer que el stock sea negativo.";
          hasErrors = true;
        }
      }
    }
  });

  return { hasErrors, errors };
};

/**
 * Validates if a product is already selected in other rows
 * @param productId ID of the product to check
 * @param rows Array of adjustment rows
 * @param excludeIdx Index to exclude from the check
 * @returns True if product is already selected
 */
export const isProductAlreadySelected = (
  productId: string,
  rows: AdjustmentRow[],
  excludeIdx: number
): boolean => {
  return rows.some(
    (row, index) =>
      index !== excludeIdx &&
      row.product?.id === productId &&
      !row.product?.has_variants
  );
};

/**
 * Validates if a variant is already selected across all rows
 * @param variantId ID of the variant to check
 * @param rows Array of adjustment rows
 * @param currentRowIdx Current row index
 * @param currentVariantIdx Current variant index
 * @returns True if variant is already selected
 */
export const isVariantAlreadySelected = (
  variantId: string,
  rows: AdjustmentRow[],
  currentRowIdx: number,
  currentVariantIdx: number
): boolean => {
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (row.product?.has_variants) {
      for (
        let variantIdx = 0;
        variantIdx < row.variantEntries.length;
        variantIdx++
      ) {
        if (
          (rowIdx !== currentRowIdx || variantIdx !== currentVariantIdx) &&
          row.variantEntries[variantIdx].variant?.id === variantId
        ) {
          return true;
        }
      }
    }
  }
  return false;
};
