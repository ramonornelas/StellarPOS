import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Divider,
  Alert,
} from "@mui/material";
import { Order, ProductOrder, ReturnData, ReturnProduct } from "./order.model";
import { formatCurrency } from "../../functions/generalFunctions";

interface ReturnModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (returnData: ReturnData) => void;
  loading?: boolean;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [selectedProductKeys, setSelectedProductKeys] = useState<Set<string>>(
    new Set()
  );
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number | undefined>
  >({});
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedProductKeys(new Set());
      setProductQuantities({});
      setRefundMethod("cash");
      setNotes("");
      setError(null);
    }
  }, [open]);

  // Helper function to normalize variant IDs (consistent with order.motor.ts)
  const normalizeVariantId = (
    productId: string,
    variantId?: string | null
  ): string => {
    if (!variantId || variantId === "no_variant" || variantId === productId) {
      return "";
    }
    return variantId;
  };

  const handleProductToggle = (product: ProductOrder, selected: boolean) => {
    const productId = product.product_id;
    const variantId = normalizeVariantId(productId, product.product_variant_id);
    const key = `${productId}|${variantId}`;

    if (selected) {
      setSelectedProductKeys((prev) => new Set([...prev, key]));
      setProductQuantities((prev) => ({ ...prev, [key]: 1 }));
    } else {
      setSelectedProductKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      setProductQuantities((prev) => {
        const { [key]: removed, ...rest } = prev;
        void removed; // Suppress unused variable warning
        return rest;
      });
    }
  };

  const handleQuantityChange = (product: ProductOrder, quantity: number) => {
    const productId = product.product_id;
    const variantId = normalizeVariantId(productId, product.product_variant_id);
    const key = `${productId}|${variantId}`;

    // Only update quantity if the product is selected
    if (selectedProductKeys.has(key)) {
      setProductQuantities((prev) => ({ ...prev, [key]: quantity }));
    }
  };

  const totalRefund = useMemo(() => {
    if (!order) return 0;

    return Array.from(selectedProductKeys).reduce((total, key) => {
      const quantity = productQuantities[key];

      // Skip if quantity is undefined, 0 or invalid
      if (!quantity || quantity <= 0) return total;

      const [productId, variantId] = key.split("|");

      const product = order.products.find((p: ProductOrder) => {
        const pId = p.product_id;
        const pVariantId = normalizeVariantId(pId, p.product_variant_id);

        return pId === productId && pVariantId === (variantId || "");
      });

      if (product) {
        // Calculate unit price: prioritize total/quantity, fallback to product_price
        const unitPrice =
          product.total && Number(product.quantity) > 0
            ? Number(product.total) / Number(product.quantity)
            : Number(product.product_price) || 0;
        const amount = unitPrice * quantity;

        return total + amount;
      }

      return total;
    }, 0);
  }, [order, selectedProductKeys, productQuantities]);

  const handleSubmit = () => {
    if (!order) return;

    // Get current cash register ID from sessionStorage
    const currentCashRegisterId =
      sessionStorage.getItem("cashRegisterId") || "";
    if (!currentCashRegisterId) {
      setError("No se encontró la caja registradora activa");
      return;
    }

    // Validate at least one product is selected with valid quantity
    const validProducts = Array.from(selectedProductKeys).filter((key) => {
      const qty = productQuantities[key];
      return qty !== undefined && qty > 0;
    });

    if (validProducts.length === 0) {
      setError(
        "Debe seleccionar al menos un producto para devolver con cantidad válida"
      );
      return;
    }

    // Build return products array
    const returnProducts: ReturnProduct[] = validProducts.map((key) => {
      const quantity = productQuantities[key] || 0;
      const [productId, variantId] = key.split("|");
      const product = order.products.find((p: ProductOrder) => {
        const pId = p.product_id;
        const pVariantId = normalizeVariantId(pId, p.product_variant_id);
        return pId === productId && pVariantId === (variantId || "");
      });

      const unitPrice =
        product && product.total && Number(product.quantity) > 0
          ? Number(product.total) / Number(product.quantity)
          : product
          ? Number(product.product_price) || 0
          : 0;

      return {
        id: productId,
        variant_id: variantId || undefined,
        quantity,
        name: product?.name || product?.product_name || "Producto desconocido",
        price: unitPrice,
      };
    });

    const returnData: ReturnData = {
      order_id: order.id,
      cash_register_id: currentCashRegisterId,
      products: returnProducts,
      refund_method: refundMethod,
      notes: notes.trim(),
    };

    setError(null);
    onSubmit(returnData);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Procesar Devolución - Ticket #{order.ticket}</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          Seleccionar productos a devolver:
        </Typography>

        <Box sx={{ mb: 3 }}>
          {order.products.map((product: ProductOrder) => {
            // Use the same key generation logic as handleProductSelection
            const productId = product.product_id;
            const variantId = normalizeVariantId(
              productId,
              product.product_variant_id
            );
            const key = `${productId}|${variantId}`;
            const maxQuantity = Number(product.quantity) || 1;
            const isSelected = selectedProductKeys.has(key);
            const currentQuantity = productQuantities[key];

            // Calculate unit price: prioritize total/quantity, fallback to product_price
            const unitPrice =
              product.total && Number(product.quantity) > 0
                ? Number(product.total) / Number(product.quantity)
                : Number(product.product_price) || 0;

            return (
              <Box
                key={key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        handleProductToggle(product, e.target.checked);
                      }}
                    />
                  }
                  label=""
                  sx={{ mr: 2 }}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">
                    {product.name || product.product_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Precio unitario: {formatCurrency(unitPrice)} | Disponible:{" "}
                    {maxQuantity}
                  </Typography>
                </Box>

                {isSelected && (
                  <TextField
                    type="number"
                    label="Cantidad"
                    value={currentQuantity !== undefined ? currentQuantity : ""}
                    onChange={(e) => {
                      const inputValue = e.target.value;

                      // Allow completely empty input (user is clearing the field)
                      if (inputValue === "") {
                        setProductQuantities((prev) => ({
                          ...prev,
                          [key]: undefined,
                        }));
                        return;
                      }

                      // Parse and validate quantity
                      const parsedValue = parseInt(inputValue);
                      if (isNaN(parsedValue) || parsedValue < 1) {
                        return; // Don't update if invalid
                      }

                      const quantity = Math.min(parsedValue, maxQuantity);
                      handleQuantityChange(product, quantity);
                    }}
                    inputProps={{ min: 1, max: maxQuantity }}
                    size="small"
                    sx={{ width: 100, ml: 2 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Método de reembolso:</FormLabel>
          <RadioGroup
            value={refundMethod}
            onChange={(e) =>
              setRefundMethod(e.target.value as "cash" | "card" | "transfer")
            }
            row
          >
            <FormControlLabel
              value="cash"
              control={<Radio />}
              label="Efectivo"
            />
            <FormControlLabel
              value="card"
              control={<Radio />}
              label="Tarjeta"
            />
            <FormControlLabel
              value="transfer"
              control={<Radio />}
              label="Transferencia"
            />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Notas (motivo de la devolución)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Typography variant="h6">
            Total a reembolsar: {formatCurrency(totalRefund)}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading ||
            selectedProductKeys.size === 0 ||
            Array.from(selectedProductKeys).every((key) => {
              const qty = productQuantities[key];
              return !qty || qty <= 0;
            })
          }
        >
          {loading ? "Procesando..." : "Confirmar Devolución"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
