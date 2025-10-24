import React, { useState } from "react";
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
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  fetchProducts,
  createInventoryMovement,
  fetchProductVariantsByProductId,
} from "../products/products-api";
import {
  Product,
  InventoryMovementRequest,
  ProductVariant,
} from "../products/products.model";
import {
  openSnackBarInventorySuccess,
  openSnackBarInventoryError,
  openSnackBarInventoryValidation,
} from "../snackbar/snackbar.motor";
import { EntradaRow } from "./inventoryEntradasTypes";
import {
  createEmptyEntradaRow,
  createEmptyVariantEntry,
  validateEntries,
  isProductAlreadySelected,
  isVariantAlreadySelected,
  calculateFinalQuantity,
  updateVariantEntryQuantity,
  updateEntradaRowQuantity,
  getSelectableProducts,
  shouldAutoRemoveRow,
} from "./inventoryEntradasValidation";

const InventoryEntradas: React.FC = () => {
  const [rows, setRows] = useState<EntradaRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rowErrors, setRowErrors] = useState<{ [key: string]: string }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchValues, setSearchValues] = useState<{ [idx: number]: string }>(
    {}
  );
  const userId = sessionStorage.getItem("stellar_userid");

  React.useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAddRow = () => {
    const newRowIndex = rows.length;
    setRows([...rows, createEmptyEntradaRow()]);
    setTimeout(() => {
      const productInput = document.querySelector(
        `#product-autocomplete-${newRowIndex}`
      ) as HTMLInputElement;
      if (productInput) {
        productInput.focus();
      }
    }, 100);
  };

  const handleRemoveRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const handleProductChange = async (idx: number, product: Product | null) => {
    const updated = [...rows];
    let error = "";

    // Para productos sin variantes, verificar que no esté ya seleccionado
    if (product && !product.has_variants) {
      if (isProductAlreadySelected(product.id, rows, idx)) {
        error = "Este producto ya está seleccionado.";
      }
    }

    // Para productos con variantes, verificar que no esté ya seleccionado
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
      updated[idx].finalQty = 0;

      // Si el producto tiene variantes, cargarlas
      if (product?.has_variants) {
        updated[idx].loadingVariants = true;
        setRows([...updated]);

        try {
          const response = await fetchProductVariantsByProductId(product.id);
          // La API devuelve un objeto con la propiedad 'variants'
          const validVariants = Array.isArray(response?.variants)
            ? response.variants
            : [];
          updated[idx].variants = validVariants;
          // Inicializar con una entrada vacía para la primera variante
          updated[idx].variantEntries = [createEmptyVariantEntry()];
          console.log(
            `Loaded ${validVariants.length} variants for product ${product.name}:`,
            validVariants
          );
        } catch (error) {
          console.error("Error loading variants:", error);
          updated[idx].variants = [];
          updated[idx].variantEntries = [];
        } finally {
          updated[idx].loadingVariants = false;
          setRows([...updated]);
        }
      } else {
        // Si el producto no tiene variantes, usar el stock del producto directamente
        updated[idx].initialQty = Number(product?.stock_available ?? 0);
        const addedQty =
          updated[idx].addedQty === "" || updated[idx].addedQty === 0
            ? 0
            : Number(updated[idx].addedQty);
        updated[idx].finalQty = calculateFinalQuantity(
          updated[idx].initialQty,
          addedQty
        );
      }
    }

    setRows(updated);
    setRowErrors((prev) => ({ ...prev, [idx]: error || "" }));
  };

  const handleVariantChange = (
    rowIdx: number,
    variantIdx: number,
    variant: ProductVariant | null
  ) => {
    const updated = [...rows];
    let error = "";

    // Verificar si la variante ya está seleccionada
    if (variant && updated[rowIdx].product) {
      if (isVariantAlreadySelected(variant.id, rows, rowIdx, variantIdx)) {
        error = "Esta variante ya está seleccionada.";
      }
    }

    if (!error) {
      updated[rowIdx].variantEntries[variantIdx].variant = variant;

      if (variant) {
        // Usar el stock_available de la variante
        updated[rowIdx].variantEntries[variantIdx].initialQty = Number(
          variant.stock_available ?? 0
        );
        const addedQty =
          updated[rowIdx].variantEntries[variantIdx].addedQty === "" ||
          updated[rowIdx].variantEntries[variantIdx].addedQty === 0
            ? 0
            : Number(updated[rowIdx].variantEntries[variantIdx].addedQty);
        updated[rowIdx].variantEntries[variantIdx].finalQty =
          calculateFinalQuantity(
            updated[rowIdx].variantEntries[variantIdx].initialQty,
            addedQty
          );
      } else {
        updated[rowIdx].variantEntries[variantIdx].initialQty = 0;
        updated[rowIdx].variantEntries[variantIdx].finalQty = 0;
      }
    }

    setRows(updated);
    const errorKey = `${rowIdx}-variant-${variantIdx}`;
    setRowErrors((prev) => ({ ...prev, [errorKey]: error || "" }));
  };

  const handleAddVariantEntry = (rowIdx: number) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries.push(createEmptyVariantEntry());
    setRows(updated);
  };

  const handleRemoveVariantEntry = (rowIdx: number, variantIdx: number) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries.splice(variantIdx, 1);

    // Si después de eliminar la variante no quedan variantes, eliminar toda la fila
    if (shouldAutoRemoveRow(updated[rowIdx])) {
      setRows(rows.filter((_, i) => i !== rowIdx));
      // Limpiar errores de la fila eliminada
      setRowErrors((prev) => {
        const copy = { ...prev };
        delete copy[rowIdx];
        // También limpiar errores de variantes de esta fila
        Object.keys(copy).forEach((key) => {
          if (key.startsWith(`${rowIdx}-variant-`)) {
            delete copy[key];
          }
        });
        return copy;
      });
    } else {
      // Si quedan variantes pero es la última entrada, mantener al menos una entrada vacía
      if (updated[rowIdx].variantEntries.length === 0) {
        updated[rowIdx].variantEntries = [createEmptyVariantEntry()];
      }

      setRows(updated);
      // Limpiar el error de la variante específica eliminada
      setRowErrors((prev) => {
        const copy = { ...prev };
        delete copy[`${rowIdx}-variant-${variantIdx}`];
        return copy;
      });
    }
  };

  const handleVariantQuantityChange = (
    rowIdx: number,
    variantIdx: number,
    value: string
  ) => {
    const updated = [...rows];
    updated[rowIdx].variantEntries[variantIdx] = updateVariantEntryQuantity(
      updated[rowIdx].variantEntries[variantIdx],
      value
    );
    setRows(updated);

    const errorKey = `${rowIdx}-variant-${variantIdx}`;
    setRowErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });
  };

  const handleQuantityChange = (idx: number, value: string) => {
    const updated = [...rows];
    updated[idx] = updateEntradaRowQuantity(updated[idx], value);
    setRows(updated);

    setRowErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[idx];
      return newErrors;
    });
  };

  const handleOpenDialog = () => {
    if (rows.length === 0) {
      openSnackBarInventoryValidation(
        "Agrega al menos un producto para continuar."
      );
      return;
    }

    const validation = validateEntries(rows);

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
      // Preparar el payload para el endpoint
      const items: Array<{
        product_id: string;
        product_variant_id: string | null;
        quantity: number;
      }> = [];

      rows.forEach((row) => {
        if (row.product) {
          if (row.product.has_variants) {
            // Agregar cada variante seleccionada con cantidad
            row.variantEntries.forEach((variantEntry) => {
              if (
                variantEntry.variant &&
                variantEntry.addedQty &&
                Number(variantEntry.addedQty) > 0
              ) {
                items.push({
                  product_id: row.product!.id,
                  product_variant_id: variantEntry.variant.id,
                  quantity: Number(variantEntry.addedQty),
                });
              }
            });
          } else {
            // Producto sin variantes
            if (row.addedQty && Number(row.addedQty) > 0) {
              items.push({
                product_id: row.product.id,
                product_variant_id: null,
                quantity: Number(row.addedQty),
              });
            }
          }
        }
      });

      const movementData: InventoryMovementRequest = {
        movement_type: "addition",
        apply: true,
        notes: "Entrada de inventario desde aplicación POS",
        user_id: userId || "",
        items: items,
      };

      const response = await createInventoryMovement(movementData);

      if (response.status === "success") {
        setDialogOpen(false);
        setRows([]);
        setRowErrors({});
        openSnackBarInventorySuccess(response.movements.length);
        fetchProducts()
          .then((data) => {
            setProducts(Array.isArray(data) ? data : []);
          })
          .catch((error) => {
            console.error("Error reloading products:", error);
          });
      } else {
        throw new Error(response.message || "Error al procesar las entradas");
      }
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      openSnackBarInventoryError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredProducts = (idx: number) => {
    const searchValue = searchValues[idx] || "";
    const selectableProducts = getSelectableProducts(products, rows, idx);

    return selectableProducts.filter((p) =>
      p.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  return (
    <Box>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Cantidad Inicial</TableCell>
              <TableCell align="right">Cantidad a Ingresar</TableCell>
              <TableCell align="right">Cantidad Final</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <React.Fragment key={idx}>
                {/* Fila principal del producto */}
                <TableRow>
                  <TableCell sx={{ minWidth: 300 }}>
                    <Autocomplete
                      options={getFilteredProducts(idx)}
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

                    {/* Indicador de carga de variantes */}
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
                        value={row.addedQty}
                        name={`addedQty-${idx}`}
                        onChange={(e) =>
                          handleQuantityChange(idx, e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        inputProps={{ min: 0, step: "0.01" }}
                        error={!!rowErrors[idx]}
                        helperText={rowErrors[idx] || ""}
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {row.product?.has_variants ? "-" : row.finalQty}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveRow(idx)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>

                {/* Subfilas de variantes */}
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
                            options={row.variants.filter((v) => {
                              return !isVariantAlreadySelected(
                                v.id,
                                rows,
                                idx,
                                variantIdx
                              );
                            })}
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
                            value={variantEntry.addedQty}
                            onChange={(e) =>
                              handleVariantQuantityChange(
                                idx,
                                variantIdx,
                                e.target.value
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            inputProps={{ min: 0, step: "0.01" }}
                            disabled={!variantEntry.variant}
                            error={!!rowErrors[`${idx}-variant-${variantIdx}`]}
                            helperText={
                              rowErrors[`${idx}-variant-${variantIdx}`] || ""
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {variantEntry.finalQty}
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

                    {/* Fila para agregar más variantes */}
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
                    </TableRow>
                  </>
                )}
              </React.Fragment>
            ))}
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddRow}
                  variant="contained"
                  size="small"
                >
                  Agregar producto
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          disabled={rows.length === 0}
        >
          Confirmar Entradas
        </Button>
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: "50vh",
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle>Resumen de Entradas</DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
                xl: "repeat(5, 1fr)",
              },
              gap: { xs: 1.5, sm: 2, md: 2.5 },
            }}
          >
            {rows.map((row, idx) => (
              <Box
                key={idx}
                sx={{
                  backgroundColor: "#f5f5f5",
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 2,
                  border: "1px solid #e0e0e0",
                  minHeight: "fit-content",
                  transition: "box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  },
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    {row.variantEntries
                      .filter(
                        (ve) =>
                          ve.variant && ve.addedQty && Number(ve.addedQty) > 0
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
                              Inicial:
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
                            <Typography variant="caption" color="success.main">
                              A agregar:
                            </Typography>
                            <Typography
                              variant="caption"
                              color="success.main"
                              fontWeight="medium"
                            >
                              +{Number(variantEntry.addedQty) || 0}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="caption" color="primary.main">
                              Final:
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary.main"
                              fontWeight="bold"
                            >
                              {variantEntry.finalQty}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                  </Box>
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
                        Inicial:
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
                      <Typography variant="caption" color="success.main">
                        A agregar:
                      </Typography>
                      <Typography
                        variant="caption"
                        color="success.main"
                        fontWeight="medium"
                      >
                        +{Number(row.addedQty) || 0}
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="caption" color="primary.main">
                        Final:
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary.main"
                        fontWeight="bold"
                      >
                        {row.finalQty}
                      </Typography>
                    </Box>
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

export default InventoryEntradas;
