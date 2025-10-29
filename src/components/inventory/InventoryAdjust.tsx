import React, { useContext, useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { DataContext } from "../../dataContext";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  fetchProductVariantsByProductId,
  createInventoryMovement,
} from "../products/products-api";
import {
  Product,
  InventoryMovementRequest,
  ProductVariant,
  InventoryMovementItem,
} from "../products/products.model";
import {
  openSnackBarInventorySuccess,
  openSnackBarInventoryError,
  openSnackBarInventoryValidation,
} from "../snackbar/snackbar.motor";

// Import modular types and functions
import { AdjustmentRow, RowErrors, SearchValues } from "./inventoryAdjustTypes";
import {
  validateEntries,
  isProductAlreadySelected,
  isVariantAlreadySelected,
} from "./inventoryAdjustValidation";
import {
  createEmptyAdjustmentRow,
  createEmptyVariantEntry,
  calculateFinalQuantity,
  getFilteredProducts,
  focusProductInput,
  removeRowErrors,
  removeVariantError,
  setError,
} from "./inventoryAdjustHelpers";

const InventoryAdjust: React.FC = () => {
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchValues, setSearchValues] = useState<SearchValues>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const userId = sessionStorage.getItem("stellar_userid");
  const dataContext = useContext(DataContext);
  const hasInitialized = useRef(false);

  // Initialize by ensuring global data is loaded (only runs once on mount)
  useEffect(() => {
    if (!hasInitialized.current && dataContext) {
      hasInitialized.current = true;

      const init = async () => {
        setLoading(true);
        try {
          if (dataContext.fetchData) {
            await dataContext.fetchData();
          }
          // Don't set products here - let the sync effect handle it
        } catch (err) {
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };

      init();
    }
  }, [dataContext]);

  // Keep local products list synchronized with DataContext changes
  useEffect(() => {
    setProducts(
      Array.isArray(dataContext?.products) ? dataContext.products : []
    );
  }, [dataContext?.products]);

  // Helper functions are now imported from inventoryAdjustHelpers and inventoryAdjustValidation

  // Event handlers
  const handleAddRow = () => {
    const newRowIndex = rows.length;
    setRows([createEmptyAdjustmentRow(), ...rows]);
    focusProductInput(newRowIndex);
  };

  const handleRemoveRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
    setRowErrors((prev) => removeRowErrors(prev, idx));
  };

  const handleProductChange = async (idx: number, product: Product | null) => {
    const updated = [...rows];
    let error = "";

    // For products without variants, check if already selected
    if (product && !product.has_variants) {
      if (isProductAlreadySelected(product.id, rows, idx)) {
        error = "Este producto ya está seleccionado.";
      }
    }

    // For products with variants, check if already selected
    if (product && product.has_variants) {
      const isAlreadySelected = rows.some(
        (row, index) => row.product?.id === product.id && index !== idx
      );
      if (isAlreadySelected) {
        error = "Este producto ya está seleccionado.";
      }
    }

    if (!error) {
      updated[idx].product = product;
      updated[idx].variants = [];
      updated[idx].variantEntries = [];
      updated[idx].initialQty = 0;
      updated[idx].adjustmentQty = "";
      updated[idx].finalQty = 0;
      updated[idx].notes = "";

      // If the product has variants, fetch them
      if (product?.has_variants) {
        updated[idx].loadingVariants = true;
        setRows([...updated]);

        try {
          const response = await fetchProductVariantsByProductId(product.id);
          const validVariants = Array.isArray(response?.variants)
            ? response.variants
            : [];
          updated[idx].variants = validVariants;
          updated[idx].variantEntries = [createEmptyVariantEntry()];
        } catch (error) {
          console.error("Error loading variants:", error);
          updated[idx].variants = [];
          updated[idx].variantEntries = [];
        } finally {
          updated[idx].loadingVariants = false;
          setRows([...updated]);
        }
      } else {
        // If the product has no variants, use the product's stock directly
        updated[idx].initialQty = Number(product?.stock_available ?? 0);
        updated[idx].finalQty = updated[idx].initialQty;
      }
    }

    setRows(updated);
    if (error) {
      setRowErrors((prev) => setError(prev, idx, error));
    } else {
      setRowErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[idx];
        return newErrors;
      });
    }
  };

  const handleVariantChange = (
    rowIdx: number,
    variantIdx: number,
    variant: ProductVariant | null
  ) => {
    const updated = [...rows];
    let error = "";

    // Verify if the variant is already selected
    if (variant && updated[rowIdx].product) {
      if (isVariantAlreadySelected(variant.id, rows, rowIdx, variantIdx)) {
        error = "Esta variante ya está seleccionada.";
      }
    }

    if (!error) {
      updated[rowIdx].variantEntries[variantIdx].variant = variant;

      if (variant) {
        updated[rowIdx].variantEntries[variantIdx].initialQty = Number(
          variant.stock_available ?? 0
        );
        updated[rowIdx].variantEntries[variantIdx].finalQty =
          updated[rowIdx].variantEntries[variantIdx].initialQty;
      } else {
        updated[rowIdx].variantEntries[variantIdx].initialQty = 0;
        updated[rowIdx].variantEntries[variantIdx].finalQty = 0;
      }
    }

    setRows(updated);
    const errorKey = `${rowIdx}-variant-${variantIdx}`;
    if (error) {
      setRowErrors((prev) => setError(prev, errorKey, error));
    } else {
      setRowErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleAddVariantEntry = (rowIdx: number) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries.push(createEmptyVariantEntry());
    setRows(updated);
  };

  const handleRemoveVariantEntry = (rowIdx: number, variantIdx: number) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries.splice(variantIdx, 1);

    // If after removing the variant no variants remain, remove the entire row
    if (updated[rowIdx].variantEntries.length === 0) {
      setRows(rows.filter((_, i) => i !== rowIdx));
      setRowErrors((prev) => removeRowErrors(prev, rowIdx));
    } else {
      // If there are variants left but it's the last entry, keep at least one empty entry
      if (updated[rowIdx].variantEntries.length === 0) {
        updated[rowIdx].variantEntries = [createEmptyVariantEntry()];
      }

      setRows(updated);
      setRowErrors((prev) => removeVariantError(prev, rowIdx, variantIdx));
    }
  };

  const handleVariantAdjustmentChange = (
    rowIdx: number,
    variantIdx: number,
    value: string
  ) => {
    const updated = [...rows];
    const variantEntry = updated[rowIdx].variantEntries[variantIdx];

    variantEntry.adjustmentQty = value;
    variantEntry.finalQty = calculateFinalQuantity(
      variantEntry.initialQty,
      value
    );

    setRows(updated);

    // Validate in real-time for negative stock
    const errorKey = `${rowIdx}-variant-${variantIdx}`;
    if (value !== "" && Number(value) !== 0) {
      const adjustmentQty = Number(value);
      if (adjustmentQty < 0 && variantEntry.finalQty < 0) {
        setRowErrors((prev) =>
          setError(
            prev,
            errorKey,
            "El ajuste no puede hacer que el stock sea negativo."
          )
        );
      } else {
        setRowErrors((prev) => removeVariantError(prev, rowIdx, variantIdx));
      }
    } else {
      setRowErrors((prev) => removeVariantError(prev, rowIdx, variantIdx));
    }
  };

  const handleVariantNotesChange = (
    rowIdx: number,
    variantIdx: number,
    value: string
  ) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries[variantIdx].notes = value;
    setRows(updated);
  };

  const handleAdjustmentChange = (idx: number, value: string) => {
    const updated = [...rows];
    updated[idx].adjustmentQty = value;
    updated[idx].finalQty = calculateFinalQuantity(
      updated[idx].initialQty,
      value
    );
    setRows(updated);

    // Validate in real-time for negative stock
    if (value !== "" && Number(value) !== 0) {
      const adjustmentQty = Number(value);
      if (adjustmentQty < 0 && updated[idx].finalQty < 0) {
        setRowErrors((prev) =>
          setError(
            prev,
            idx,
            "El ajuste no puede hacer que el stock sea negativo."
          )
        );
      } else {
        setRowErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[idx];
          return newErrors;
        });
      }
    } else {
      setRowErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[idx];
        return newErrors;
      });
    }
  };

  const handleNotesChange = (idx: number, value: string) => {
    const updated = [...rows];
    updated[idx].notes = value;
    setRows(updated);
  };

  // Validation functions are now imported from inventoryAdjustValidation

  const handleOpenDialog = () => {
    if (rows.length === 0) {
      openSnackBarInventoryValidation(
        "Agrega al menos un producto para continuar."
      );
      return;
    }

    const validation = validateEntries(rows, generalNotes);

    if (validation.hasErrors) {
      setRowErrors(validation.errors);
      openSnackBarInventoryValidation(
        "Corrige los errores antes de confirmar."
      );
      return;
    }

    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Prepare items for the API request
      const items: InventoryMovementItem[] = [];

      rows.forEach((row) => {
        if (row.product) {
          if (row.product.has_variants) {
            // Add each selected variant with adjustment
            row.variantEntries.forEach((variantEntry) => {
              if (
                variantEntry.variant &&
                variantEntry.adjustmentQty !== "" &&
                Number(variantEntry.adjustmentQty) !== 0
              ) {
                items.push({
                  product_id: row.product!.id,
                  product_variant_id: variantEntry.variant.id,
                  quantity: Number(variantEntry.adjustmentQty),
                  notes: variantEntry.notes || undefined,
                });
              }
            });
          } else {
            // Add the product directly if it has no variants
            if (row.adjustmentQty !== "" && Number(row.adjustmentQty) !== 0) {
              items.push({
                product_id: row.product.id,
                product_variant_id: null,
                quantity: Number(row.adjustmentQty),
                notes: row.notes || undefined,
              });
            }
          }
        }
      });

      const movementData: InventoryMovementRequest = {
        movement_type: "adjustment",
        apply: true,
        notes: generalNotes || "Ajuste de inventario desde aplicación POS",
        user_id: userId || "",
        items: items,
      };

      const response = await createInventoryMovement(movementData);

      if (response.status === "success") {
        setDialogOpen(false);
        setRows([]);
        setRowErrors({});
        setGeneralNotes("");
        openSnackBarInventorySuccess(response.movements.length);

        // Refresh global dataset so UI shows updated stock immediately
        try {
          if (dataContext && typeof dataContext.fetchData === "function") {
            await dataContext.fetchData();
          }
        } catch (err) {
          console.error("Error refreshing global dataset:", err);
        }
      } else {
        // Handle API errors with detailed information
        let errorMessage = response.message || "Error al procesar los ajustes";

        if (response.errors && response.errors.length > 0) {
          const errorDetails = response.errors
            .map((error) => {
              const productInfo = error.product_variant_id
                ? `${error.product_id} (variante: ${error.product_variant_id})`
                : error.product_id;
              return `• ${productInfo}: ${error.reason}`;
            })
            .join("\n");

          errorMessage = `${errorMessage}\n\nDetalles de los errores:\n${errorDetails}`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      openSnackBarInventoryError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredProductsForRow = (idx: number) => {
    return getFilteredProducts(
      idx,
      products,
      rows,
      searchValues,
      isProductAlreadySelected
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Cargando productos...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* General Notes Field */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Notas generales del ajuste *"
          placeholder="Describe el motivo general del ajuste de inventario..."
          value={generalNotes}
          onChange={(e) => {
            setGeneralNotes(e.target.value);
            // Clear general notes error when user starts typing
            if (rowErrors["generalNotes"]) {
              setRowErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors["generalNotes"];
                return newErrors;
              });
            }
          }}
          multiline
          rows={2}
          variant="outlined"
          size="small"
          error={!!rowErrors["generalNotes"]}
          helperText={rowErrors["generalNotes"] || "Campo obligatorio"}
        />
      </Box>

      {/* Add Product Button */}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddRow}
        variant="contained"
        size="small"
        sx={{ mb: 2 }}
      >
        Agregar producto
      </Button>

      {/* Adjustments Table */}
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Stock Actual</TableCell>
              <TableCell align="right">Ajuste (Δ)</TableCell>
              <TableCell align="right">Stock Final</TableCell>
              <TableCell>Notas del Producto</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <React.Fragment key={row.id}>
                {/* Main product row */}
                <TableRow>
                  <TableCell sx={{ minWidth: 300 }}>
                    <Autocomplete
                      options={getFilteredProductsForRow(idx)}
                      getOptionLabel={(option) => option.name}
                      loading={loading}
                      value={row.product}
                      onChange={(_, value) => handleProductChange(idx, value)}
                      inputValue={searchValues[idx] || ""}
                      onInputChange={(_, value) =>
                        setSearchValues((prev) => ({ ...prev, [idx]: value }))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          id={`product-autocomplete-${idx}`}
                          label="Producto"
                          variant="standard"
                          error={!!rowErrors[idx] && !row.product}
                          helperText={
                            !!rowErrors[idx] && !row.product
                              ? rowErrors[idx]
                              : ""
                          }
                        />
                      )}
                      isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                    />

                    {/* Loading variants indicator */}
                    {row.product?.has_variants && row.loadingVariants && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          ml: 2,
                          mt: 1,
                          fontStyle: "italic",
                          display: "block",
                        }}
                      >
                        Cargando variantes...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {row.product?.has_variants ? "-" : row.initialQty}
                  </TableCell>
                  <TableCell align="right">
                    {!row.product?.has_variants ? (
                      <TextField
                        type="number"
                        variant="standard"
                        value={row.adjustmentQty}
                        onChange={(e) =>
                          handleAdjustmentChange(idx, e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        inputProps={{ step: "0.01" }}
                        error={!!rowErrors[idx]}
                        helperText={rowErrors[idx] || ""}
                        sx={{ width: 100 }}
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {row.product?.has_variants ? (
                      "-"
                    ) : (
                      <Chip
                        label={row.finalQty}
                        size="small"
                        color={
                          row.finalQty > row.initialQty
                            ? "success"
                            : row.finalQty < row.initialQty
                            ? "warning"
                            : "default"
                        }
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!row.product?.has_variants ? (
                      <TextField
                        variant="standard"
                        value={row.notes}
                        onChange={(e) => handleNotesChange(idx, e.target.value)}
                        placeholder="Motivo del ajuste..."
                        size="small"
                        fullWidth
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveRow(idx)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>

                {/* Variant subrows */}
                {row.product?.has_variants && !row.loadingVariants && (
                  <>
                    {row.variantEntries.map((variantEntry, variantIdx) => (
                      <TableRow
                        key={`${idx}-variant-${variantIdx}`}
                        sx={{
                          backgroundColor: "#f8f9fa",
                          "& td": {
                            borderBottom:
                              variantIdx === row.variantEntries.length - 1
                                ? "1px solid rgba(224, 224, 224, 1)"
                                : "none",
                          },
                        }}
                      >
                        <TableCell sx={{ pl: 4 }}>
                          <Autocomplete
                            options={row.variants.filter(
                              (v) =>
                                !isVariantAlreadySelected(
                                  v.id,
                                  rows,
                                  idx,
                                  variantIdx
                                )
                            )}
                            getOptionLabel={(option) => option.name}
                            value={variantEntry.variant}
                            onChange={(_, value) =>
                              handleVariantChange(idx, variantIdx, value)
                            }
                            disabled={!row.product || row.variants.length === 0}
                            size="small"
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={`↳ Variante ${variantIdx + 1}`}
                                variant="standard"
                                size="small"
                                error={
                                  !!rowErrors[`${idx}-variant-${variantIdx}`]
                                }
                                helperText={
                                  rowErrors[`${idx}-variant-${variantIdx}`] ||
                                  ""
                                }
                                sx={{
                                  "& .MuiInputLabel-root": {
                                    fontSize: "0.875rem",
                                    fontStyle: "italic",
                                    color: "text.secondary",
                                  },
                                }}
                              />
                            )}
                            isOptionEqualToValue={(opt, val) =>
                              opt.id === val?.id
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {variantEntry.initialQty}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="standard"
                            size="small"
                            value={variantEntry.adjustmentQty}
                            onChange={(e) =>
                              handleVariantAdjustmentChange(
                                idx,
                                variantIdx,
                                e.target.value
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            inputProps={{ step: "0.01" }}
                            disabled={!variantEntry.variant}
                            error={!!rowErrors[`${idx}-variant-${variantIdx}`]}
                            helperText={
                              rowErrors[`${idx}-variant-${variantIdx}`] || ""
                            }
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={variantEntry.finalQty}
                            size="small"
                            color={
                              variantEntry.finalQty > variantEntry.initialQty
                                ? "success"
                                : variantEntry.finalQty <
                                  variantEntry.initialQty
                                ? "warning"
                                : "default"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            variant="standard"
                            value={variantEntry.notes}
                            onChange={(e) =>
                              handleVariantNotesChange(
                                idx,
                                variantIdx,
                                e.target.value
                              )
                            }
                            placeholder="Motivo del ajuste..."
                            size="small"
                            fullWidth
                            disabled={!variantEntry.variant}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleRemoveVariantEntry(idx, variantIdx)
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Add more variants row */}
                    <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                      <TableCell
                        sx={{
                          pl: 4,
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      >
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleAddVariantEntry(idx)}
                          sx={{
                            fontSize: "0.75rem",
                            color: "primary.main",
                            textTransform: "none",
                          }}
                        >
                          + Agregar otra variante
                        </Button>
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      />
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      />
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      />
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      />
                      <TableCell
                        sx={{
                          borderBottom: "1px solid rgba(224, 224, 224, 1)",
                        }}
                      />
                    </TableRow>
                  </>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          disabled={rows.length === 0}
        >
          Confirmar Ajustes
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "50vh",
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle>Resumen de Ajustes de Inventario</DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* General Notes */}
          {generalNotes && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Notas generales:</strong> {generalNotes}
              </Typography>
            </Alert>
          )}

          {/* Adjustments Summary */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: { xs: 1.5, sm: 2, md: 2.5 },
            }}
          >
            {rows.map((row, idx) => (
              <Box key={`${row.id}-${idx}`}>
                {/* Product header */}
                <Box
                  sx={{
                    backgroundColor: "#f5f5f5",
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    mb: row.product?.has_variants ? 1 : 0,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mb: 1,
                      color: "primary.main",
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                      fontWeight: "bold",
                      lineHeight: 1.2,
                    }}
                  >
                    {row.product?.name}
                  </Typography>

                  {row.product?.has_variants ? (
                    <Typography variant="caption" color="text.secondary">
                      Ver ajustes por variante abajo
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        backgroundColor: "white",
                        p: { xs: 1, sm: 1.5 },
                        borderRadius: 1,
                        border: "1px solid #d0d0d0",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.25,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Stock Actual:
                        </Typography>
                        <Typography variant="caption" fontWeight="medium">
                          {row.initialQty}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.25,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color={
                            Number(row.adjustmentQty) >= 0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          Ajuste:
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            Number(row.adjustmentQty) >= 0
                              ? "success.main"
                              : "error.main"
                          }
                          fontWeight="medium"
                        >
                          {Number(row.adjustmentQty) >= 0 ? "+" : ""}
                          {Number(row.adjustmentQty) || 0}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: row.notes ? 0.25 : 0,
                        }}
                      >
                        <Typography variant="caption" color="primary.main">
                          Stock Final:
                        </Typography>
                        <Typography
                          variant="caption"
                          color="primary.main"
                          fontWeight="bold"
                        >
                          {row.finalQty}
                        </Typography>
                      </Box>

                      {row.notes && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid #eee" }}>
                          <Typography variant="caption" color="text.secondary">
                            Notas: {row.notes}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Variant adjustments */}
                {row.product?.has_variants && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    {row.variantEntries
                      .filter(
                        (ve) =>
                          ve.variant &&
                          ve.adjustmentQty !== "" &&
                          Number(ve.adjustmentQty) !== 0
                      )
                      .map((variantEntry, variantIdx) => (
                        <Box
                          key={variantIdx}
                          sx={{
                            backgroundColor: "white",
                            p: { xs: 1, sm: 1.5 },
                            borderRadius: 1,
                            border: "1px solid #d0d0d0",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 0.5,
                              fontWeight: "medium",
                              color: "text.primary",
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            • {variantEntry.variant?.name}
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.25,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Stock Actual:
                            </Typography>
                            <Typography variant="caption" fontWeight="medium">
                              {variantEntry.initialQty}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.25,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color={
                                Number(variantEntry.adjustmentQty) >= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                            >
                              Ajuste:
                            </Typography>
                            <Typography
                              variant="caption"
                              color={
                                Number(variantEntry.adjustmentQty) >= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                              fontWeight="medium"
                            >
                              {Number(variantEntry.adjustmentQty) >= 0
                                ? "+"
                                : ""}
                              {Number(variantEntry.adjustmentQty) || 0}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: variantEntry.notes ? 0.25 : 0,
                            }}
                          >
                            <Typography variant="caption" color="primary.main">
                              Stock Final:
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary.main"
                              fontWeight="bold"
                            >
                              {variantEntry.finalQty}
                            </Typography>
                          </Box>

                          {variantEntry.notes && (
                            <Box
                              sx={{ mt: 1, pt: 1, borderTop: "1px solid #eee" }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Notas: {variantEntry.notes}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {submitting ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryAdjust;
