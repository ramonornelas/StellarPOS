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
} from "../products/products-api";
import { Product, InventoryMovementRequest } from "../products/products.model";
import {
  openSnackBarInventorySuccess,
  openSnackBarInventoryError,
  openSnackBarInventoryValidation,
} from "../snackbar/snackbar.motor";

interface EntradaRow {
  product: Product | null;
  initialQty: number;
  addedQty: number | string;
  finalQty: number;
}

const InventoryEntradas: React.FC = () => {
  const [rows, setRows] = useState<EntradaRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rowErrors, setRowErrors] = useState<{ [idx: number]: string }>({});
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

  const selectedProductIds = rows.map((r) => r.product?.id).filter(Boolean);

  const handleAddRow = () => {
    const newRowIndex = rows.length;
    setRows([
      ...rows,
      {
        product: null,
        initialQty: 0,
        addedQty: "",
        finalQty: 0,
      },
    ]);
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

  const handleProductChange = (idx: number, product: Product | null) => {
    const updated = [...rows];
    let error = "";

    if (selectedProductIds.includes(product?.id)) {
      error = "Producto ya seleccionado.";
    } else {
      updated[idx].product = product;
      updated[idx].initialQty = Number(product?.stock_available ?? 0);
      const addedQty =
        updated[idx].addedQty === "" || updated[idx].addedQty === 0
          ? 0
          : Number(updated[idx].addedQty);
      updated[idx].finalQty = Number(
        (Number(updated[idx].initialQty) + Number(addedQty)).toFixed(2)
      );
    }

    setRows(updated);
    setRowErrors((prev) => ({ ...prev, [idx]: error || "" }));
  };

  const handleQuantityChange = (idx: number, value: string) => {
    const updated = [...rows];
    updated[idx].addedQty = value;
    const qty = value === "" ? 0 : Number(value);
    updated[idx].finalQty = Number(
      (Number(updated[idx].initialQty) + qty).toFixed(2)
    );
    setRows(updated);

    setRowErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[idx];
      return newErrors;
    });
  };

  const handleOpenDialog = () => {
    const newErrors: { [idx: number]: string } = {};
    const productErrors: { [idx: number]: string } = {};
    const quantityErrors: { [idx: number]: string } = {};
    let hasValidationErrors = false;

    rows.forEach((row, idx) => {
      if (!row.product) {
        productErrors[idx] = "Selecciona un producto";
        hasValidationErrors = true;
      }

      const qtyValue = Number(row.addedQty);
      if (!row.addedQty || row.addedQty === "" || qtyValue <= 0) {
        quantityErrors[idx] = "Ingresa una cantidad válida mayor a 0";
        hasValidationErrors = true;
      } else if (qtyValue < 0) {
        quantityErrors[idx] = "La cantidad no puede ser negativa";
        hasValidationErrors = true;
      }
    });

    rows.forEach((row, idx) => {
      if (productErrors[idx] && !row.product) {
        newErrors[idx] = productErrors[idx];
      } else if (quantityErrors[idx]) {
        newErrors[idx] = quantityErrors[idx];
      }
    });

    setRowErrors(newErrors);

    if (rows.length === 0) {
      openSnackBarInventoryValidation(
        "Agrega al menos un producto para continuar."
      );
      return;
    }

    if (hasValidationErrors) {
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
      const movementData: InventoryMovementRequest = {
        movement_type: "addition",
        apply: true,
        notes: "Entrada de inventario desde aplicación POS",
        user_id: userId || "",
        items: rows.map((row) => ({
          product_id: row.product!.id,
          product_variant_id: null,
          quantity: Number(row.addedQty),
        })),
      };

      const response = await createInventoryMovement(movementData);

      if (response.status === "success") {
        setDialogOpen(false);
        setRows([]);
        setRowErrors({});
        openSnackBarInventorySuccess(response.movements.length);
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
    return products.filter(
      (p) =>
        (!selectedProductIds.includes(p.id) ||
          rows[idx]?.product?.id === p.id) &&
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
              <TableRow key={idx}>
                <TableCell sx={{ minWidth: 220 }}>
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
                          !!rowErrors[idx] && !row.product ? rowErrors[idx] : ""
                        }
                      />
                    )}
                    isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                  />
                </TableCell>
                <TableCell align="right">{row.initialQty}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    variant="standard"
                    value={row.addedQty}
                    name={`addedQty-${idx}`}
                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    inputProps={{ min: 0, step: "0.01" }}
                    error={!!rowErrors[idx]}
                    helperText={rowErrors[idx] || ""}
                  />
                </TableCell>
                <TableCell align="right">{row.finalQty}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveRow(idx)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Resumen de Entradas</DialogTitle>
        <DialogContent>
          {rows.map((row, idx) => (
            <Box key={idx} sx={{ mb: 1 }}>
              <Typography>
                <strong>{row.product?.name}</strong>: +
                {Number(row.addedQty) || 0} (Final: {row.finalQty})
              </Typography>
            </Box>
          ))}
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
