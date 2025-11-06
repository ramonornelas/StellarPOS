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
import { Order } from "./order.model";
import { Product } from "../products/products.model";
import { formatCurrency } from "../../functions/generalFunctions";

interface ReturnModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (returnData: ReturnData) => void;
  loading?: boolean;
}

export interface ReturnProduct {
  id: string;
  variant_id?: string;
  quantity: number;
  name: string;
  price: number;
}

export interface ReturnData {
  order_id: string;
  cash_register_id: string;
  products: ReturnProduct[];
  refund_method: "cash" | "card" | "transfer";
  notes: string;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  order,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [selectedProducts, setSelectedProducts] = useState<
    Record<string, number>
  >({});
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedProducts({});
      setRefundMethod("cash");
      setNotes("");
      setError(null);
    }
  }, [open]);

  // Helper function to normalize variant IDs
  const normalizeVariantId = (productId: string, variantId?: string | null) => {
    const result =
      !variantId || variantId === "no_variant" || variantId === productId
        ? ""
        : variantId;

    return result;
  };

  const handleProductSelection = (
    product: Product & { product_id?: string },
    quantity: number
  ) => {
    // Use product_id if available, fallback to id
    const productId = product.product_id || product.id;
    // Normalize variant_id using helper function
    const variantId = normalizeVariantId(productId, product.product_variant_id);
    const key = `${productId}|${variantId}`;

    if (quantity > 0) {
      setSelectedProducts((prev) => ({ ...prev, [key]: quantity }));
    } else {
      setSelectedProducts((prev) => {
        const { [key]: removed, ...rest } = prev;
        void removed; // Suppress unused variable warning
        return rest;
      });
    }
  };

  const totalRefund = useMemo(() => {
    if (!order) return 0;

    return Object.entries(selectedProducts).reduce((total, [key, quantity]) => {
      const [productId, variantId] = key.split("|");

      const product = order.products.find(
        (p: Product & { product_id?: string }) => {
          const pId = p.product_id || p.id;
          const pVariantId = normalizeVariantId(pId, p.product_variant_id);

          return pId === productId && pVariantId === (variantId || "");
        }
      );

      if (product) {
        const amount = product.price * quantity;

        return total + amount;
      }

      return total;
    }, 0);
  }, [order, selectedProducts]);

  const handleSubmit = () => {
    if (!order) return;

    // Validate at least one product is selected
    if (Object.keys(selectedProducts).length === 0) {
      setError("Debe seleccionar al menos un producto para devolver");
      return;
    }

    // Build return products array
    const returnProducts: ReturnProduct[] = Object.entries(
      selectedProducts
    ).map(([key, quantity]) => {
      const [productId, variantId] = key.split("|");
      const product = order.products.find((p) => {
        const pId = (p as Product & { product_id?: string }).product_id || p.id;
        const pVariantId = normalizeVariantId(pId, p.product_variant_id);
        return pId === productId && pVariantId === (variantId || "");
      });

      return {
        id: productId,
        variant_id: variantId || undefined,
        quantity,
        name: product?.name || "Producto desconocido",
        price: product?.price || 0,
      };
    });

    const returnData: ReturnData = {
      order_id: order.id,
      cash_register_id: order.cash_register_id,
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
          {order.products.map((product) => {
            // Use the same key generation logic as handleProductSelection
            const productId =
              (product as Product & { product_id?: string }).product_id ||
              product.id;
            const variantId = normalizeVariantId(
              productId,
              product.product_variant_id
            );
            const key = `${productId}|${variantId}`;
            const maxQuantity = product.quantity || 1;
            const currentQuantity = selectedProducts[key] || 0;

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
                      checked={currentQuantity > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleProductSelection(product, 1);
                        } else {
                          handleProductSelection(product, 0);
                        }
                      }}
                    />
                  }
                  label=""
                  sx={{ mr: 2 }}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Precio: {formatCurrency(product.price)} | Disponible:{" "}
                    {maxQuantity}
                  </Typography>
                </Box>

                {currentQuantity > 0 && (
                  <TextField
                    type="number"
                    label="Cantidad"
                    value={currentQuantity}
                    onChange={(e) => {
                      const quantity = Math.min(
                        parseInt(e.target.value) || 0,
                        maxQuantity
                      );
                      handleProductSelection(product, quantity);
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
          disabled={loading || Object.keys(selectedProducts).length === 0}
        >
          {loading ? "Procesando..." : "Confirmar Devolución"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
