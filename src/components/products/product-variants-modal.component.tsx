import React from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  TextField,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Product, ProductVariantModal } from "./products.model";
import classes from "./css/modal-select-variant.module.css";
import {
  addProductVariant,
  deleteProductVariant,
  fetchProductVariantsByProductId,
  updateProductVariant,
} from "./products-api";
import Button from "@mui/material/Button";
import { formatCurrency } from "../../functions/generalFunctions";
import { DataContext } from "../../dataContext";

interface ProductVariantsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export const ProductVariantsModal: React.FC<ProductVariantsModalProps> = ({
  open,
  onClose,
  product,
}) => {
  const [variants, setVariants] = React.useState<ProductVariantModal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    price: "",
    display_order: "",
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [variantToDelete, setVariantToDelete] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Use DataContext as single source of truth; call fetchData after changes
  const { fetchData } = React.useContext(DataContext);

  // Función para ordenar variantes por display_order
  const sortVariants = (variantsToSort: ProductVariantModal[]) => {
    return [...variantsToSort].sort((a, b) => {
      const orderA = Number(a.display_order);
      const orderB = Number(b.display_order);
      return orderA - orderB;
    });
  };

  React.useEffect(() => {
    if (open && product?.id) {
      setLoading(true);
      fetchProductVariantsByProductId(product.id)
        .then((data) => {
          const variantsList = Array.isArray(data?.variants)
            ? data.variants
            : [];
          setVariants(sortVariants(variantsList));
        })
        .finally(() => setLoading(false));
    } else {
      setVariants([]);
    }
    setShowForm(false);
    setForm({ name: "", price: "", display_order: "" });
    setFormError(null);
    setApiError(null);
    setEditingVariant(null);
    setDeleteDialogOpen(false);
    setVariantToDelete(null);
  }, [open, product]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError(null);
    setApiError(null);
  };

  const handleEditVariant = (variant: ProductVariantModal) => {
    setForm({
      name: variant.name.toString(),
      price: variant.price.toString(),
      display_order: variant.display_order.toString(),
    });
    setEditingVariant(variant.id);
    setShowForm(true);
    setFormError(null);
    setApiError(null);
  };

  const handleDeleteClick = (variant: ProductVariantModal) => {
    setVariantToDelete({ id: variant.id, name: variant.name.toString() });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!variantToDelete) return;

    setDeleting(true);
    setApiError(null);

    try {
      await deleteProductVariant(product.id, variantToDelete.id);
      setVariants((prev) =>
        prev.filter((variant) => variant.id !== variantToDelete.id)
      );
      // Refresh global dataset so product lists and home reflect the change
      await fetchData();
      setDeleteDialogOpen(false);
      setVariantToDelete(null);
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error?.message || "Error al eliminar la variante.");
      // Mantenemos el diálogo abierto para mostrar el error
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación básica
    if (!form.name.trim() || !form.price.trim() || !form.display_order.trim()) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }
    if (isNaN(Number(form.price)) || isNaN(Number(form.display_order))) {
      setFormError("Precio y orden deben ser números válidos.");
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      if (editingVariant) {
        // Actualizar variante existente
        const updatedVariant = await updateProductVariant(
          product.id,
          editingVariant,
          {
            name: form.name,
            price: Number(form.price),
            display_order: Number(form.display_order),
          }
        );

        if (updatedVariant && updatedVariant.id) {
          setVariants((prev) => {
            const updated = prev.map((v) =>
              v.id === editingVariant ? updatedVariant : v
            );
            return sortVariants(updated);
          });
          // Refresh global dataset so all screens show updated data
          await fetchData();
          setShowForm(false);
          setForm({ name: "", price: "", display_order: "" });
          setEditingVariant(null);
        } else {
          setApiError("No se pudo actualizar la variante. Intenta nuevamente.");
        }
      } else {
        // Agregar nueva variante
        const newVariant = await addProductVariant(product.id, {
          name: form.name,
          price: Number(form.price),
          display_order: Number(form.display_order),
        });

        if (newVariant && newVariant.id) {
          setVariants((prev) => {
            const updated = [...prev, newVariant];
            return sortVariants(updated);
          });
          // Refresh global dataset so all screens show the new variant/product state
          await fetchData();
          setShowForm(false);
          setForm({ name: "", price: "", display_order: "" });
        } else {
          setApiError("No se pudo crear la variante. Intenta nuevamente.");
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error?.message || "Error al procesar la variante.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm({ name: "", price: "", display_order: "" });
    setFormError(null);
    setApiError(null);
    setEditingVariant(null);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="modal-variants-title"
        aria-describedby="modal-variants-description"
      >
        <Box className={classes["modal-style"]}>
          <Typography
            id="modal-variants-title"
            variant="h6"
            component="h2"
            sx={{ textAlign: "center" }}
          >
            <strong>{product.name}</strong>
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ position: "absolute", top: "12px", right: "12px" }}
          >
            <CloseIcon />
          </IconButton>
          {apiError && !showForm && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {apiError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Variantes de este producto:
          </Typography>
          <Box mt={2}>
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Cargando variantes...
              </Typography>
            ) : variants.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay variantes registradas para este producto.
              </Typography>
            ) : (
              <Box>
                {variants.map((variant) => (
                  <Box
                    key={variant.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      my: 1,
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      sx={{
                        flex: 1,
                        justifyContent: "space-between",
                        display: "flex",
                      }}
                    >
                      <span>{variant.name}</span>
                      <span>{formatCurrency(Number(variant.price))}</span>
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditVariant(variant)}
                      sx={{ flexShrink: 0 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(variant)}
                      sx={{ flexShrink: 0 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Box mt={3}>
            {!showForm ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setShowForm(true)}
              >
                Agregar variante
              </Button>
            ) : (
              <Box component="form" onSubmit={handleSubmitVariant}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {editingVariant
                    ? "Editar variante"
                    : "Agregar nueva variante"}
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Nombre"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    size="small"
                    required
                  />
                  <TextField
                    label="Precio"
                    name="price"
                    value={form.price}
                    onChange={handleFormChange}
                    size="small"
                    required
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                  <TextField
                    label="Orden de visualización"
                    name="display_order"
                    value={form.display_order}
                    onChange={handleFormChange}
                    size="small"
                    required
                    type="number"
                    inputProps={{ min: 0, step: "1" }}
                  />
                  {formError && <Alert severity="warning">{formError}</Alert>}
                  {apiError && <Alert severity="error">{apiError}</Alert>}
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={cancelForm}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="success"
                      disabled={submitting}
                    >
                      {editingVariant ? "Actualizar" : "Guardar"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Eliminar variante</DialogTitle>
        <DialogContent>
          {variantToDelete && (
            <Typography variant="body1">
              ¿Estás seguro que deseas eliminar la variante "
              {variantToDelete.name}"?
            </Typography>
          )}
          {apiError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {apiError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
