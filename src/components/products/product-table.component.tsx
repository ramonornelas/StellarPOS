import React, { useContext, useEffect, useState, useRef } from "react";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "./products-api";
import {
  openSnackBarProductAdded,
  openSnackBarProductError,
  openSnackBarDeleteError,
  openSnackBarSaveChangesFirst,
} from "../snackbar/snackbar.motor";
import { Product } from "./products.model";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Checkbox,
  FormControlLabel,
  Switch,
  Box,
  InputAdornment,
  IconButton,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { formatCurrency } from "../../functions/generalFunctions";
import { ProductVariantsModal } from "./product-variants-modal.component";
import { DataContext } from "../../dataContext";

const ProductTable: React.FC = () => {
  const dataContext = useContext(DataContext);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: "asc" | "desc";
  } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [addMode, setAddMode] = useState(false);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingImages, setUploadingImages] = useState<
    Record<string, boolean>
  >({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    category_id: "",
    is_active: true,
    has_variants: false,
    image_url: "",
    category_name: "",
    description: "",
    is_combo: false,
    product_variant_id: "",
    display_order: 999,
    barcode: "",
  });
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] =
    useState<Product | null>(null);
  const [updatingVariants, setUpdatingVariants] = useState<string | null>(null); // ID del producto que está actualizando variantes
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name: string;
    price: string;
  }>({
    name: "",
    price: "",
  });
  const [editValidationErrors, setEditValidationErrors] = useState<{
    name: string;
    price: string;
  }>({
    name: "",
    price: "",
  });

  // Create stable references to avoid dependency warnings
  const contextProducts = dataContext?.products;
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
    setProducts(Array.isArray(contextProducts) ? contextProducts : []);
  }, [contextProducts]);

  const filteredAndSortedProducts = React.useMemo(() => {
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    };

    const filterProductsBySearch = (
      productList: Product[],
      searchText: string
    ): Product[] => {
      if (!searchText || searchText.trim() === "") {
        return productList;
      }

      const normalizedSearch = normalizeText(searchText.trim());

      return productList.filter((product: Product) => {
        const normalizedName = normalizeText(product.name || "");
        return normalizedName.includes(normalizedSearch);
      });
    };

    let filtered = showOnlyVisible
      ? products.filter((product) => product.is_active)
      : products;

    // Exclude combos from product administration
    filtered = filtered.filter((product) => !product.is_combo);

    filtered = filterProductsBySearch(filtered, searchTerm);

    if (!sortConfig) {
      return [...filtered].sort((a, b) => {
        const aOrder = a.display_order ?? 999999;
        const bOrder = b.display_order ?? 999999;
        return aOrder - bOrder;
      });
    }
    const { key, direction } = sortConfig;
    return [...filtered].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (key === "price") {
        const aNum =
          typeof aValue === "number" ? aValue : parseFloat(String(aValue));
        const bNum =
          typeof bValue === "number" ? bValue : parseFloat(String(bValue));
        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        const cmp = aValue.localeCompare(bValue, undefined, {
          sensitivity: "base",
        });
        return direction === "asc" ? cmp : -cmp;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return direction === "asc"
          ? aValue === bValue
            ? 0
            : aValue
            ? -1
            : 1
          : aValue === bValue
          ? 0
          : aValue
          ? 1
          : -1;
      }
      return 0;
    });
  }, [products, sortConfig, showOnlyVisible, searchTerm]);

  const handleSort = (key: keyof Product) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleEdit = (id: string) => {
    const product = products.find((p) => p.id === id);
    setEditId(id);
    setEditData(product ? { ...product } : {});
    setEditValidationErrors({ name: "", price: "" });
  };

  const handleCheckboxToggle = (product: Product, fieldName: keyof Product) => {
    const updatedProduct = {
      ...product,
      [fieldName]: !product[fieldName],
    };

    if (fieldName === "has_variants" && !product.has_variants) {
      updatedProduct.price = 0;
    }

    setEditId(product.id);
    setEditData(updatedProduct);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const isChecked = (e.target as HTMLInputElement).checked;

    // Limpiar errores de validación cuando el usuario empiece a escribir
    if (name === "name" && editValidationErrors.name) {
      setEditValidationErrors((prev) => ({ ...prev, name: "" }));
    }
    if (name === "price" && editValidationErrors.price) {
      setEditValidationErrors((prev) => ({ ...prev, price: "" }));
    }

    // Si se cambia has_variants, limpiar error de precio ya que se deshabilita/habilita
    if (name === "has_variants") {
      setEditValidationErrors((prev) => ({ ...prev, price: "" }));
    }

    setEditData((prev) => {
      const newData = {
        ...prev,
        [name!]:
          type === "checkbox"
            ? isChecked
            : name === "price" && value === ""
            ? ""
            : value,
      };

      if (name === "has_variants" && isChecked) {
        newData.price = 0;
      }

      return newData;
    });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditValidationErrors({ name: "", price: "" });
  };

  const handleSave = async () => {
    if (!editId) return;

    // Validación con errores inline
    const errors = { name: "", price: "" };

    if (!editData.name || editData.name.trim() === "") {
      errors.name = "El nombre es obligatorio";
    }

    if (!editData.has_variants) {
      const priceValue = editData.price;
      const numericPrice = Number(priceValue);

      if (!priceValue || numericPrice === 0) {
        errors.price = "El precio es obligatorio";
      } else if (numericPrice < 0) {
        errors.price = "El precio debe ser mayor que 0";
      }
    }

    // Si hay errores, mostrarlos y no continuar
    if (errors.name || errors.price) {
      setEditValidationErrors(errors);
      return;
    }

    try {
      await updateProduct(editId, editData);

      // after successful save, refresh global dataset so Home sees updates
      if (dataContext && typeof dataContext.fetchData === "function") {
        await dataContext.fetchData();
      }
    } catch (error) {
      openSnackBarProductError("Hubo un error al actualizar el producto.");
    } finally {
      setEditId(null);
      setEditValidationErrors({ name: "", price: "" });
    }
  };

  const handleAddChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Limpiar errores de validación cuando el usuario empiece a escribir
    if (name === "name" && validationErrors.name) {
      setValidationErrors((prev) => ({ ...prev, name: "" }));
    }
    if (name === "price" && validationErrors.price) {
      setValidationErrors((prev) => ({ ...prev, price: "" }));
    }

    // Si se cambia has_variants, limpiar error de precio ya que se deshabilita/habilita
    if (name === "has_variants") {
      setValidationErrors((prev) => ({ ...prev, price: "" }));
    }

    setNewProduct((prev) => ({
      ...prev,
      [name!]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "price" && value === ""
          ? ""
          : value,
    }));
  };

  const handleCancelAdd = () => {
    setAddMode(false);
    setValidationErrors({ name: "", price: "" });
    setNewProduct({
      name: "",
      price: 0,
      category_id: "",
      is_active: true,
      has_variants: false,
      image_url: "",
      category_name: "",
      description: "",
      is_combo: false,
      product_variant_id: "",
      display_order: 999,
      barcode: "",
    });
  };

  const handleAdd = async () => {
    const errors = { name: "", price: "" };

    if (!newProduct.name || newProduct.name.trim() === "") {
      errors.name = "El nombre es obligatorio";
    }

    if (!newProduct.has_variants) {
      const priceValue = newProduct.price;
      const numericPrice = Number(priceValue);

      if (!priceValue || numericPrice === 0) {
        errors.price = "El precio es obligatorio";
      } else if (numericPrice < 0) {
        errors.price = "El precio debe ser mayor que 0";
      }
    }

    if (errors.name || errors.price) {
      setValidationErrors(errors);
      return;
    }

    try {
      await addProduct(newProduct);

      // after successful add, refresh global dataset so Home sees updates
      if (dataContext && typeof dataContext.fetchData === "function") {
        await dataContext.fetchData();
      }

      openSnackBarProductAdded(
        newProduct.name || "",
        Number(newProduct.price) || 0
      );
    } catch (error) {
      openSnackBarProductError("Hubo un error al agregar el producto.");
    } finally {
      setAddMode(false);
      setNewProduct({
        name: "",
        price: 0,
        category_id: "",
        is_active: true,
        has_variants: false,
        image_url: "",
        category_name: "",
        description: "",
        is_combo: false,
        product_variant_id: "",
        display_order: 999,
        barcode: "",
      });
      setValidationErrors({ name: "", price: "" });
    }
  };

  const handleDeleteClick = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setProductToDelete({
        id: product.id,
        name: product.name || "Sin nombre",
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setDeleting(true);

    try {
      await deleteProduct(productToDelete.id);

      // after successful delete, refresh global dataset so Home sees updates
      if (dataContext && typeof dataContext.fetchData === "function") {
        await dataContext.fetchData();
      }

      setDeleteDialogOpen(false);
      setProductToDelete(null);
      setEditId(null);
    } catch (error) {
      openSnackBarDeleteError();
    } finally {
      setDeleting(false);
    }
  };

  const handleImageUpload = async (file: File, productId: string) => {
    setUploadErrors((prev) => ({ ...prev, [productId]: "" }));

    setUploadingImages((prev) => ({ ...prev, [productId]: true }));

    try {
      const response = await uploadProductImage(file);

      if (response.statusCode === 200 && response.data?.image_url) {
        setEditData((prev) => ({
          ...prev,
          image_url: response.data.image_url,
        }));
        // Refresh global dataset so Home and ProductsList reflect the new image
        if (dataContext && typeof dataContext.fetchData === "function") {
          await dataContext.fetchData();
        }
      } else {
        throw new Error("Respuesta inesperada del servidor");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al subir la imagen";
      setUploadErrors((prev) => ({ ...prev, [productId]: errorMessage }));
    } finally {
      setUploadingImages((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    productId: string
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file, productId);
    }
    event.target.value = "";
  };

  const handleImageUploadForNew = async (file: File) => {
    setUploadErrors((prev) => ({ ...prev, ["new"]: "" }));

    setUploadingImages((prev) => ({ ...prev, ["new"]: true }));

    try {
      const response = await uploadProductImage(file);

      if (response.statusCode === 200 && response.data?.image_url) {
        setNewProduct((prev) => ({
          ...prev,
          image_url: response.data.image_url,
        }));
        // Refresh global dataset in case image upload affects server-side data
        if (dataContext && typeof dataContext.fetchData === "function") {
          await dataContext.fetchData();
        }
      } else {
        throw new Error("Respuesta inesperada del servidor");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al subir la imagen";
      setUploadErrors((prev) => ({ ...prev, ["new"]: errorMessage }));
    } finally {
      setUploadingImages((prev) => ({ ...prev, ["new"]: false }));
    }
  };

  const handleFileSelectForNew = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUploadForNew(file);
    }
    event.target.value = "";
  };

  const handleOpenVariantsModal = async (product: Product) => {
    if (
      editId === product.id &&
      editData.has_variants !== product.has_variants
    ) {
      try {
        setUpdatingVariants(product.id);
        await handleSave();
        const updatedProduct: Product = {
          ...product,
          has_variants: editData.has_variants ?? false,
        };
        setVariantModalProduct(updatedProduct);
        setVariantModalOpen(true);
      } catch (error) {
        openSnackBarSaveChangesFirst();
      } finally {
        setUpdatingVariants(null);
      }
    } else {
      setVariantModalProduct(product);
      setVariantModalOpen(true);
    }
  };

  const handleCloseVariantsModal = async () => {
    setVariantModalOpen(false);
    setVariantModalProduct(null);
    // Ensure global dataset is refreshed after potential variant changes
    if (dataContext && typeof dataContext.fetchData === "function") {
      await dataContext.fetchData();
    }
  };

  return (
    <TableContainer component={Paper} sx={{ px: 1.5, py: 2 }}>
      <Box sx={{ margin: "10px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            gap: 2,
            mb: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => setAddMode(true)}
            startIcon={<AddIcon />}
          >
            Agregar Producto
          </Button>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              minWidth: { xs: "auto", md: 300 },
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar productos por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="limpiar búsqueda"
                      onClick={() => setSearchTerm("")}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 600,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                },
              }}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={showOnlyVisible}
                onChange={(e) => setShowOnlyVisible(e.target.checked)}
                color="primary"
              />
            }
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0px",
              "& span": {
                fontSize: "12.5px",
              },
            }}
            label="Solo visibles en caja"
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {filteredAndSortedProducts.length === 0 ? (
              searchTerm || showOnlyVisible ? (
                "No se encontraron productos"
              ) : (
                "No hay productos disponibles"
              )
            ) : (
              <>
                <strong>{filteredAndSortedProducts.length}</strong> producto
                {filteredAndSortedProducts.length !== 1 ? "s" : ""}
                {filteredAndSortedProducts.length !== products.length && (
                  <>
                    {" "}
                    de <strong>{products.length}</strong> total
                    {products.length !== 1 ? "es" : ""}
                  </>
                )}
              </>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}></Box>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ height: 32 }}>
            <TableCell
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: "bold",
              }}
              onClick={() => handleSort("display_order")}
            >
              Orden{" "}
              {sortConfig?.key === "display_order"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </TableCell>
            <TableCell style={{ padding: "4px 8px", fontWeight: "bold" }}>
              Imagen
            </TableCell>
            <TableCell
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: "bold",
              }}
              onClick={() => handleSort("name")}
            >
              Nombre{" "}
              {sortConfig?.key === "name"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </TableCell>
            <TableCell
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: "bold",
              }}
              onClick={() => handleSort("has_variants")}
            >
              Variantes{" "}
              {sortConfig?.key === "has_variants"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </TableCell>
            <TableCell
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: "bold",
                textAlign: "center",
              }}
              onClick={() => handleSort("price")}
            >
              Precio
              {sortConfig?.key === "price"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </TableCell>

            <TableCell
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                fontWeight: "bold",
              }}
              onClick={() => handleSort("is_active")}
            >
              Visible en caja{" "}
              {sortConfig?.key === "is_active"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </TableCell>
            <TableCell style={{ padding: "4px 8px", fontWeight: "bold" }}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <CircularProgress size={24} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Cargando productos...
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {addMode && (
                <TableRow sx={{ height: 32 }}>
                  <TableCell style={{ padding: "4px 8px" }}>
                    <TextField
                      name="display_order"
                      value={newProduct.display_order ?? ""}
                      onChange={handleAddChange}
                      type="number"
                      size="small"
                    />
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px", minWidth: 120 }}>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {/* Botón para subir archivo */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {/* Preview de imagen */}
                        {newProduct.image_url && (
                          <img
                            src={newProduct.image_url}
                            alt="Preview"
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 4,
                              border: "1px solid #ddd",
                            }}
                          />
                        )}
                        <input
                          accept=".png,.jpg,.jpeg,.gif,.webp"
                          style={{ display: "none" }}
                          id="upload-button-new"
                          type="file"
                          onChange={(e) => handleFileSelectForNew(e)}
                        />
                        <label htmlFor="upload-button-new">
                          <Button
                            variant="outlined"
                            component="span"
                            size="small"
                            disabled={uploadingImages["new"]}
                            startIcon={
                              uploadingImages["new"] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <CloudUploadIcon />
                              )
                            }
                            sx={{ fontSize: "0.7rem", minWidth: "auto" }}
                          >
                            {uploadingImages["new"] ? "Subiendo..." : "Subir"}
                          </Button>
                        </label>
                      </Box>

                      {/* Error de upload */}
                      {uploadErrors["new"] && (
                        <Alert
                          severity="error"
                          sx={{ fontSize: "0.7rem", py: 0 }}
                        >
                          {uploadErrors["new"]}
                        </Alert>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px" }}>
                    <TextField
                      name="name"
                      value={newProduct.name || ""}
                      onChange={handleAddChange}
                      size="small"
                      required
                      error={!!validationErrors.name}
                      helperText={validationErrors.name}
                      sx={{
                        "& .Mui-error": {
                          margin: "auto",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px" }}>
                    <Checkbox
                      name="has_variants"
                      checked={!!newProduct.has_variants}
                      onChange={handleAddChange}
                      size="small"
                    />
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px", textAlign: "right" }}>
                    <TextField
                      name="price"
                      value={
                        newProduct.price === 0 ? "" : newProduct.price ?? ""
                      }
                      onChange={handleAddChange}
                      type="number"
                      size="small"
                      sx={{
                        textAlign: "right",
                        "& .Mui-error": {
                          margin: "auto",
                        },
                      }}
                      required={!newProduct.has_variants}
                      disabled={!!newProduct.has_variants}
                      error={!!validationErrors.price}
                      helperText={validationErrors.price}
                    />
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px" }}>
                    <Checkbox
                      name="is_active"
                      checked={!!newProduct.is_active}
                      onChange={handleAddChange}
                      size="small"
                    />
                  </TableCell>
                  <TableCell style={{ padding: "4px 8px" }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Cancelar">
                        <IconButton
                          onClick={handleCancelAdd}
                          color="error"
                          size="small"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Agregar">
                        <IconButton
                          onClick={handleAdd}
                          color="success"
                          size="small"
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => (
                  <TableRow key={product.id} sx={{ height: 32 }}>
                    <TableCell style={{ padding: "4px 8px" }}>
                      {editId === product.id ? (
                        <TextField
                          name="display_order"
                          value={editData.display_order ?? ""}
                          onChange={handleChange}
                          type="number"
                          size="small"
                        />
                      ) : (
                        product.display_order
                      )}
                    </TableCell>
                    <TableCell style={{ padding: "4px 8px", minWidth: 120 }}>
                      {editId === product.id ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {editData.image_url && (
                              <img
                                src={editData.image_url}
                                alt="Preview"
                                style={{
                                  width: 40,
                                  height: 40,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                  border: "1px solid #ddd",
                                }}
                              />
                            )}
                            <input
                              accept=".png,.jpg,.jpeg,.gif,.webp"
                              style={{ display: "none" }}
                              id={`upload-button-${product.id}`}
                              type="file"
                              onChange={(e) => handleFileSelect(e, product.id)}
                            />
                            <label htmlFor={`upload-button-${product.id}`}>
                              <Button
                                variant="outlined"
                                component="span"
                                size="small"
                                disabled={uploadingImages[product.id]}
                                startIcon={
                                  uploadingImages[product.id] ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <CloudUploadIcon />
                                  )
                                }
                                sx={{ fontSize: "0.7rem", minWidth: "auto" }}
                              >
                                {uploadingImages[product.id]
                                  ? "Subiendo..."
                                  : "Subir"}
                              </Button>
                            </label>
                          </Box>

                          {uploadErrors[product.id] && (
                            <Alert
                              severity="error"
                              sx={{ fontSize: "0.7rem", py: 0 }}
                            >
                              {uploadErrors[product.id]}
                            </Alert>
                          )}
                        </Box>
                      ) : product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{
                            width: 32,
                            height: 32,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            background: "#bbb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ color: "#fff", fontSize: 18 }}>?</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell style={{ padding: "4px 8px" }}>
                      {editId === product.id ? (
                        <TextField
                          name="name"
                          value={editData.name || ""}
                          onChange={handleChange}
                          size="small"
                          required
                          error={!!editValidationErrors.name}
                          helperText={editValidationErrors.name}
                          sx={{ "& .Mui-error": { margin: "auto" } }}
                        />
                      ) : (
                        product.name
                      )}
                    </TableCell>
                    <TableCell style={{ padding: "4px 8px" }}>
                      {editId === product.id ? (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Checkbox
                            name="has_variants"
                            checked={!!editData.has_variants}
                            onChange={handleChange}
                            size="small"
                          />
                          {editData.has_variants && (
                            <Tooltip
                              title={
                                updatingVariants === product.id
                                  ? "Actualizando estado de variantes..."
                                  : "Ver/Editar variantes"
                              }
                            >
                              <IconButton
                                onClick={() => handleOpenVariantsModal(product)}
                                color="primary"
                                size="small"
                                disabled={updatingVariants === product.id}
                              >
                                {updatingVariants === product.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <ListAltIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Checkbox
                            name="has_variants"
                            checked={!!product.has_variants}
                            onClick={() =>
                              handleCheckboxToggle(product, "has_variants")
                            }
                            sx={{
                              "& svg": { fill: "#4d4d4d" },
                              ":hover": { backgroundColor: "transparent" },
                            }}
                          />
                          {product.has_variants && (
                            <Tooltip title="Ver/Editar variantes">
                              <IconButton
                                onClick={() => handleOpenVariantsModal(product)}
                                color="primary"
                                size="small"
                              >
                                <ListAltIcon fontSize="medium" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell
                      style={{
                        padding: "4px 8px",
                        textAlign: "right",
                      }}
                    >
                      {editId === product.id ? (
                        <TextField
                          name="price"
                          value={
                            editData.has_variants
                              ? "0"
                              : editData.price === 0
                              ? ""
                              : editData.price ?? ""
                          }
                          onChange={handleChange}
                          type="number"
                          size="small"
                          disabled={!!editData.has_variants}
                          placeholder={
                            editData.has_variants ? "Precio por variante" : ""
                          }
                          required={!editData.has_variants}
                          error={!!editValidationErrors.price}
                          helperText={editValidationErrors.price}
                          sx={{
                            textAlign: "right",
                            "& .MuiInputBase-input.Mui-disabled": {
                              cursor: "not-allowed",
                              backgroundColor: "rgba(0,0,0,0.045)",
                            },
                            "& .Mui-error": {
                              margin: "auto",
                            },
                          }}
                        />
                      ) : product.has_variants ? null : (
                        formatCurrency(product.price)
                      )}
                    </TableCell>

                    <TableCell style={{ padding: "4px 8px" }}>
                      {editId === product.id ? (
                        <Checkbox
                          name="is_active"
                          checked={!!editData.is_active}
                          onChange={handleChange}
                          size="small"
                        />
                      ) : (
                        <Checkbox
                          name="is_active"
                          checked={!!product.is_active}
                          onClick={() =>
                            handleCheckboxToggle(product, "is_active")
                          }
                          sx={{
                            "& svg": { fill: "#4d4d4d" },
                            ":hover": { backgroundColor: "transparent" },
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell style={{ padding: "4px 8px" }}>
                      {editId === product.id ? (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Guardar">
                            <IconButton
                              onClick={handleSave}
                              color="success"
                              size="small"
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar">
                            <IconButton
                              onClick={handleCancelEdit}
                              color="error"
                              size="small"
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Editar">
                            <IconButton
                              onClick={() => handleEdit(product.id)}
                              color="info"
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              onClick={() => handleDeleteClick(product.id)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align="center"
                    sx={{
                      py: 4,
                      borderBottom: "none",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography variant="h6" color="text.secondary">
                        {searchTerm || showOnlyVisible ? (
                          <>
                            No se encontraron productos
                            {searchTerm ? (
                              <>
                                {" "}
                                que coincidan con "<strong>{searchTerm}</strong>
                                "
                              </>
                            ) : null}
                            {showOnlyVisible ? <> visibles en caja</> : null}
                          </>
                        ) : (
                          "No hay productos disponibles"
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm || showOnlyVisible
                          ? "Intente ajustar los filtros o términos de búsqueda"
                          : "Agregue nuevos productos utilizando el botón 'Agregar Producto'"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
      {variantModalProduct && (
        <ProductVariantsModal
          open={variantModalOpen}
          onClose={handleCloseVariantsModal}
          product={variantModalProduct}
        />
      )}

      {/* Diálogo de confirmación para eliminar producto */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Eliminar producto</DialogTitle>
        <DialogContent>
          {productToDelete && (
            <Typography variant="body1">
              ¿Estás seguro que deseas eliminar el producto "
              {productToDelete.name}"?
            </Typography>
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
    </TableContainer>
  );
};

export default ProductTable;
