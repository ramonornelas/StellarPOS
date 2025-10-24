import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  fetchProductsWithVariants,
  validatePhysicalCount,
  applyPhysicalCount,
} from "../products/products-api";
import { CountableItem, CountItem } from "../products/products.model";
import {
  openSnackBarInventoryError,
  openSnackBarInventoryValidation,
} from "../snackbar/snackbar.motor";
import { enqueueSnackbar } from "notistack";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";

type CountMode = "initial" | "recount";

// Type for items from the products with stock API
interface ApiStockItem {
  product_id: string;
  product_variant_id: string | null;
  name: string;
}

const InventoryConteoFisico: React.FC = () => {
  const [countableItems, setCountableItems] = useState<CountableItem[]>([]);
  const [recountItems, setRecountItems] = useState<CountableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<CountMode>("initial");

  // Load products with stock when component mounts
  useEffect(() => {
    loadProductsWithVariants();
  }, []);

  const loadProductsWithVariants = async () => {
    setLoading(true);
    try {
      const response = await fetchProductsWithVariants();

      // The response has the format: { status: "success", items: [...], total: number }
      const apiItems = response?.items || [];

      const items: CountableItem[] = [];
      const productGroups: {
        [key: string]: { name: string; variants: ApiStockItem[] };
      } = {};

      // First, group by product_id (this is the most reliable)
      apiItems.forEach((apiItem: ApiStockItem) => {
        const isVariant = apiItem.product_variant_id !== null;

        if (isVariant) {
          // It's a variant - group by product_id
          if (!productGroups[apiItem.product_id]) {
            // Extract product name from the full name
            // Try various formats: "Product — Variant", "Product - Variant", etc.
            const nameParts = apiItem.name.split(/\s*[—–-]\s*/);
            let productName = nameParts[0]?.trim() || apiItem.name;

            // If there's only one part, it might be just the variant name
            // In that case, we use the full name as a temporary reference
            if (nameParts.length === 1) {
              productName = `Producto ${apiItem.product_id.substring(0, 8)}`;
            }

            productGroups[apiItem.product_id] = {
              name: productName,
              variants: [],
            };
          }
          productGroups[apiItem.product_id].variants.push(apiItem);
        } else {
          // It's a product without variants
          items.push({
            id: `product-${apiItem.product_id}`,
            product_id: apiItem.product_id,
            product_variant_id: null,
            product_name: apiItem.name,
            display_name: apiItem.name,
            is_variant: false,
            stock_available: 0,
            counted_quantity: "",
          });
        }
      });

      // Now process the groups of products with variants
      Object.entries(productGroups).forEach(([productId, group]) => {
        // Use the first element's name as product name if it couldn't be extracted correctly
        let finalProductName = group.name;
        if (
          finalProductName.includes(`Producto ${productId.substring(0, 8)}`)
        ) {
          // If we used the temporary name, try to get a better name from the first element
          const firstVariant = group.variants[0];
          if (firstVariant) {
            const nameParts = firstVariant.name.split(/\s*[—–-]\s*/);
            finalProductName = nameParts[0]?.trim() || firstVariant.name;
          }
        }

        // Add product header row
        items.push({
          id: `product-header-${productId}`,
          product_id: productId,
          product_variant_id: null,
          product_name: finalProductName,
          display_name: finalProductName,
          is_variant: false,
          stock_available: 0,
          counted_quantity: "",
          isProductHeader: true, // Mark as product header
        });

        // Add variants as subrows
        group.variants.forEach((variant, index) => {
          // Extract variant name from the full name
          const nameParts = variant.name.split(/\s*[—–-]\s*/);
          let variantName =
            nameParts.length > 1 ? nameParts[1]?.trim() : variant.name;

          // If we couldn't extract the variant name, use the full name
          if (!variantName || variantName === group.name) {
            variantName = variant.name;
          }

          // If the variant name equals the product name, use "Variant N"
          if (variantName === group.name) {
            variantName = `Variante ${index + 1}`;
          }

          items.push({
            id: `variant-${variant.product_variant_id}`,
            product_id: variant.product_id,
            product_variant_id: variant.product_variant_id,
            product_name: finalProductName,
            variant_name: variantName,
            display_name: variant.name,
            is_variant: true,
            stock_available: 0,
            counted_quantity: "",
          });
        });
      });

      // Sort: keep product groups together
      items.sort((a, b) => {
        // First sort by product_id to keep groups together
        if (a.product_id !== b.product_id) {
          return a.product_id.localeCompare(b.product_id);
        }

        // Within the same product_id, headers first, then variants
        if (a.isProductHeader && !b.isProductHeader) return -1;
        if (!a.isProductHeader && b.isProductHeader) return 1;

        // Between variants of the same product, sort by name
        if (a.is_variant && b.is_variant) {
          return (a.variant_name || "").localeCompare(b.variant_name || "");
        }

        return 0;
      });

      setCountableItems(items);
    } catch (error) {
      console.error("Error loading products with stock:", error);
      openSnackBarInventoryError("Error al cargar productos con stock");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    if (mode === "initial") {
      setCountableItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, counted_quantity: value } : item
        )
      );
    } else {
      setRecountItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, counted_quantity: value } : item
        )
      );
    }
  };

  const handleContinuar = async () => {
    // Get all items that should be counted (excluding product headers)
    const allCountableItems = countableItems.filter(
      (item) => !item.isProductHeader
    );

    // Validate that ALL items have entered quantity
    const itemsWithCount = allCountableItems.filter(
      (item) =>
        item.counted_quantity !== "" && Number(item.counted_quantity) >= 0
    );

    if (itemsWithCount.length !== allCountableItems.length) {
      const missingCount = allCountableItems.length - itemsWithCount.length;
      openSnackBarInventoryValidation(
        `Debes contar todos los productos. Faltan ${missingCount} productos por contar.`
      );
      return;
    }

    const userId = sessionStorage.getItem("stellar_userid") || "";
    if (!userId) {
      openSnackBarInventoryError("No se encontró el ID del usuario");
      return;
    }

    setSubmitting(true);
    try {
      // Prepare data for validation
      const countItems: CountItem[] = itemsWithCount.map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        quantity: Number(item.counted_quantity),
      }));

      const validationResponse = await validatePhysicalCount(
        countItems,
        userId
      );

      if (validationResponse.needs_recount.length === 0) {
        // No differences, apply directly
        const applyResponse = await applyPhysicalCount(countItems, userId);

        if (applyResponse.status === "success") {
          enqueueSnackbar("Conteo físico registrado correctamente", {
            variant: "success",
            autoHideDuration: 4000,
          });
          // Reset for new session
          resetToInitialState();
        } else {
          throw new Error(
            applyResponse.message || "Error al aplicar conteo físico"
          );
        }
      } else {
        // There are differences, switch to recount mode
        // Filter items that need recount, including headers of related products
        const itemsToRecount: CountableItem[] = [];
        const productIdsNeedingRecount = new Set<string>();
        const variantKeys = new Set<string>();

        // Identify which products/variants need recount
        validationResponse.needs_recount.forEach((needsItem) => {
          if (needsItem.product_id) {
            productIdsNeedingRecount.add(needsItem.product_id);
          }
          // When backend includes product_variant_id, create a key for precise matching
          if (needsItem.product_variant_id) {
            variantKeys.add(
              `${needsItem.product_id}|${needsItem.product_variant_id}`
            );
          }
        });

        // Determine which products have specifically flagged variants (to include header)
        const productHasFlaggedVariant = new Set<string>();
        countableItems.forEach((item) => {
          if (!item.isProductHeader && item.product_variant_id) {
            const key = `${item.product_id}|${item.product_variant_id}`;
            if (variantKeys.has(key)) {
              productHasFlaggedVariant.add(item.product_id);
            }
          }
        });

        // Build the recount list:
        // - If variantKeys exist for a product, include only those variants
        // - If no variantKeys (old response), include all variants of the product_id
        // - Include product header if appropriate
        countableItems.forEach((item) => {
          if (item.isProductHeader) {
            // Show header if the product was flagged (by product_id) or if any of its variants was flagged
            if (
              productIdsNeedingRecount.has(item.product_id) ||
              productHasFlaggedVariant.has(item.product_id)
            ) {
              itemsToRecount.push(item);
            }
          } else {
            const key = `${item.product_id}|${item.product_variant_id || ""}`;

            // If variantKeys exist for this product, require match by variant
            const hasVariantSpecific = Array.from(variantKeys).some((k) =>
              k.startsWith(item.product_id + "|")
            );

            if (hasVariantSpecific) {
              if (variantKeys.has(key)) {
                itemsToRecount.push({ ...item, counted_quantity: "" });
              }
            } else {
              // No variantKeys; fall back to product_id behavior (include all variants)
              if (productIdsNeedingRecount.has(item.product_id)) {
                itemsToRecount.push({ ...item, counted_quantity: "" });
              }
            }
          }
        });

        setRecountItems(itemsToRecount);
        setMode("recount");
      }
    } catch (error) {
      console.error("Error validating physical count:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      openSnackBarInventoryError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmar = async () => {
    // Validate that all recount items have quantity (excluding headers)
    const actualRecountItems = recountItems.filter(
      (item) => !item.isProductHeader
    );
    const itemsWithCount = actualRecountItems.filter(
      (item) =>
        item.counted_quantity !== "" && Number(item.counted_quantity) >= 0
    );

    if (itemsWithCount.length !== actualRecountItems.length) {
      const missingCount = actualRecountItems.length - itemsWithCount.length;
      openSnackBarInventoryValidation(
        `Debes completar el reconteo de todos los productos. Faltan ${missingCount} productos por recontar.`
      );
      return;
    }

    const userId = sessionStorage.getItem("stellar_userid") || "";
    if (!userId) {
      openSnackBarInventoryError("No se encontró el ID del usuario");
      return;
    }

    setSubmitting(true);
    try {
      const countItems: CountItem[] = itemsWithCount.map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        quantity: Number(item.counted_quantity),
      }));

      const applyResponse = await applyPhysicalCount(countItems, userId);

      if (applyResponse.status === "success") {
        enqueueSnackbar("Conteo físico registrado correctamente", {
          variant: "success",
          autoHideDuration: 4000,
        });
        // Reset for new session
        resetToInitialState();
      } else {
        throw new Error(
          applyResponse.message || "Error al aplicar conteo físico"
        );
      }
    } catch (error) {
      console.error("Error applying physical count:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      openSnackBarInventoryError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetToInitialState = () => {
    setMode("initial");
    setRecountItems([]);
    loadProductsWithVariants(); // Reload fresh data
  };

  const currentItems = mode === "initial" ? countableItems : recountItems;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Cargando productos con variantes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header con información del modo */}
      <Box sx={{ mb: 3 }}>
        {mode === "initial" ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Conteo Inicial:</strong> Debes contar TODOS los productos
              de la lista. Ingresa las cantidades contadas físicamente.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Reconteo Requerido:</strong> Se detectaron diferencias en
              los siguientes items. Debes completar el reconteo de TODOS los
              productos mostrados.
            </Typography>
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Chip
            label={mode === "initial" ? "Conteo Inicial" : "Reconteo"}
            color={mode === "initial" ? "primary" : "warning"}
            variant="filled"
          />
          <Typography variant="body2" color="text.secondary">
            Total de productos:{" "}
            {currentItems.filter((item) => !item.isProductHeader).length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contados:{" "}
            <strong>
              {
                currentItems.filter(
                  (item) =>
                    !item.isProductHeader &&
                    item.counted_quantity !== "" &&
                    Number(item.counted_quantity) >= 0
                ).length
              }
            </strong>
          </Typography>
          <Chip
            label={
              currentItems.filter(
                (item) =>
                  !item.isProductHeader &&
                  item.counted_quantity !== "" &&
                  Number(item.counted_quantity) >= 0
              ).length ===
              currentItems.filter((item) => !item.isProductHeader).length
                ? "✓ Completo"
                : "Pendiente"
            }
            size="small"
            color={
              currentItems.filter(
                (item) =>
                  !item.isProductHeader &&
                  item.counted_quantity !== "" &&
                  Number(item.counted_quantity) >= 0
              ).length ===
              currentItems.filter((item) => !item.isProductHeader).length
                ? "success"
                : "warning"
            }
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Tabla de conteo */}
      <TableContainer sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="center">Cantidad Contada</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay items para contar
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((item) => {
                // If it's a product header (only for products with variants)
                if (item.isProductHeader) {
                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: "#e3f2fd",
                        "& td": {
                          borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                        },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            color: "primary.main",
                            fontSize: "0.95rem",
                          }}
                        >
                          {item.product_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Producto con Variantes"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic", fontSize: "0.8rem" }}
                        >
                          Contar variantes ↓
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Normal row for product without variants or variant
                return (
                  <TableRow
                    key={item.id}
                    sx={{
                      backgroundColor: item.is_variant ? "#f3faff" : "inherit",
                      "& td": {
                        borderBottom: item.is_variant
                          ? "1px solid rgba(224, 224, 224, 0.5)"
                          : "1px solid rgba(224, 224, 224, 1)",
                      },
                    }}
                  >
                    <TableCell sx={{ pl: item.is_variant ? 5 : 2 }}>
                      {item.is_variant ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "medium",
                            color: "text.primary",
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <SubdirectoryArrowRightIcon
                            fontSize="small"
                            sx={{ color: "primary.main" }}
                          />
                          {item.variant_name}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium" }}
                        >
                          {item.display_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.is_variant ? "Variante" : "Producto"}
                        size="small"
                        color={item.is_variant ? "secondary" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        variant="outlined"
                        size="small"
                        value={item.counted_quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        placeholder=""
                        inputProps={{
                          min: 0,
                          step: "0.01",
                          style: { textAlign: "center" },
                        }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Botones de acción */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={mode === "initial" ? handleContinuar : handleConfirmar}
          disabled={
            submitting ||
            currentItems.filter((item) => !item.isProductHeader).length === 0
          }
          startIcon={
            submitting ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {submitting
            ? "Procesando..."
            : mode === "initial"
            ? "Continuar"
            : "Confirmar"}
        </Button>
      </Box>
    </Box>
  );
};

export default InventoryConteoFisico;
