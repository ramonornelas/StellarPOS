import React, { useEffect, useState } from "react";
import {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "./products-api";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { formatCurrency } from "../../functions/generalFunctions";
import { ProductVariantsModal } from "./product-variants-modal.component";

const ProductTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: "asc" | "desc";
  } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false); // Toggle para filtrar productos visibles
  const [searchTerm, setSearchTerm] = useState(""); // Término de búsqueda
  const [uploadingImages, setUploadingImages] = useState<
    Record<string, boolean>
  >({}); // Estado de carga por producto
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({}); // Errores de carga por producto
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
    display_order: 0,
    barcode: "",
  });
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] =
    useState<Product | null>(null);

  useEffect(() => {
    fetchProducts().then((products) => {
      setProducts(products);
    });
  }, [refreshFlag]);

  const filteredAndSortedProducts = React.useMemo(() => {
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remover acentos
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

    filtered = filterProductsBySearch(filtered, searchTerm);

    if (!sortConfig) {
      // Default sort by display_order (ascendente)
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
        // Always sort price as number
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
  console.log("Filtered and Sorted Products:", filteredAndSortedProducts);

  const handleEdit = (id: string) => {
    const product = products.find((p) => p.id === id);
    setEditId(id);
    setEditData(product ? { ...product } : {});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setEditData((prev) => ({
      ...prev,
      [name!]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "price" && value === ""
          ? ""
          : value,
    }));
  };

  const handleSave = async () => {
    if (!editId) return;
    try {
      await updateProduct(editId, editData);
    } catch (error) {
      alert("Hubo un error al actualizar el producto.");
    } finally {
      setEditId(null);
      setRefreshFlag((flag) => !flag);
    }
  };

  const handleAddChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
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

  const handleAdd = async () => {
    try {
      await addProduct(newProduct);
      openSnackBarProductAdded(
        newProduct.name || "",
        Number(newProduct.price) || 0
      );
    } catch (error) {
      alert("Hubo un error al agregar el producto.");
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
        display_order: 0,
        barcode: "",
      });
      setRefreshFlag((flag) => !flag);
    }
  };

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    const name = product?.name || "";
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el producto "${name}"?`
      )
    )
      return;
    try {
      await deleteProduct(id);
    } catch (error) {
      alert("Hubo un error al eliminar el producto.");
    } finally {
      setEditId(null);
      setRefreshFlag((flag) => !flag);
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

  const handleOpenVariantsModal = (product: Product) => {
    setVariantModalProduct(product);
    setVariantModalOpen(true);
  };

  const handleCloseVariantsModal = () => {
    setVariantModalOpen(false);
    setVariantModalProduct(null);
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
              }}
              onClick={() => handleSort("price")}
            >
              Precio{" "}
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
              onClick={() => handleSort("is_combo")}
            >
              Combo{" "}
              {sortConfig?.key === "is_combo"
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {/* Botón para subir archivo */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    <Alert severity="error" sx={{ fontSize: "0.7rem", py: 0 }}>
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
                  value={newProduct.price === 0 ? "" : newProduct.price ?? ""}
                  onChange={handleAddChange}
                  type="number"
                  size="small"
                  sx={{ textAlign: "right" }}
                />
              </TableCell>
              <TableCell style={{ padding: "4px 8px" }}>
                <Checkbox
                  name="is_combo"
                  checked={!!newProduct.is_combo}
                  onChange={handleAddChange}
                  size="small"
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
                  <Tooltip title="Agregar">
                    <IconButton
                      onClick={handleAdd}
                      color="success"
                      size="small"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar">
                    <IconButton
                      onClick={() => setAddMode(false)}
                      color="error"
                      size="small"
                    >
                      <CancelIcon fontSize="small" />
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
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
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
                    />
                  ) : (
                    product.name
                  )}
                </TableCell>
                <TableCell style={{ padding: "4px 8px" }}>
                  {editId === product.id ? (
                    <Checkbox
                      name="has_variants"
                      checked={!!editData.has_variants}
                      onChange={handleChange}
                      size="small"
                    />
                  ) : (
                    <Checkbox
                      name="has_variants"
                      checked={!!product.has_variants}
                      sx={{
                        "& svg": { fill: "#4d4d4d" },
                        cursor: "default",
                        ":hover": { backgroundColor: "transparent" },
                      }}
                    />
                  )}
                </TableCell>
                <TableCell style={{ padding: "4px 8px", textAlign: "right" }}>
                  {editId === product.id ? (
                    <TextField
                      name="price"
                      value={editData.price === 0 ? "" : editData.price ?? ""}
                      onChange={handleChange}
                      type="number"
                      size="small"
                      sx={{ textAlign: "right" }}
                    />
                  ) : product.has_variants ? null : (
                    formatCurrency(product.price)
                  )}
                </TableCell>

                <TableCell style={{ padding: "4px 8px" }}>
                  {editId === product.id ? (
                    <Checkbox
                      name="is_combo"
                      checked={!!editData.is_combo}
                      onChange={handleChange}
                      size="small"
                    />
                  ) : (
                    <Checkbox
                      name="is_combo"
                      checked={!!product.is_combo}
                      sx={{
                        "& svg": { fill: "#4d4d4d" },
                        cursor: "default",
                        ":hover": { backgroundColor: "transparent" },
                      }}
                    />
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
                      sx={{
                        "& svg": { fill: "#4d4d4d" },
                        cursor: "default",
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
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancelar">
                        <IconButton
                          onClick={() => setEditId(null)}
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
                          onClick={() => handleDelete(product.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {product.has_variants && (
                        <Tooltip title="Ver/Editar variantes">
                          <IconButton
                            onClick={() => handleOpenVariantsModal(product)}
                            color="primary"
                            size="small"
                          >
                            <Inventory2Icon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
                            que coincidan con "<strong>{searchTerm}</strong>"
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
        </TableBody>
      </Table>
      {variantModalProduct && (
        <ProductVariantsModal
          open={variantModalOpen}
          onClose={handleCloseVariantsModal}
          product={variantModalProduct}
        />
      )}
    </TableContainer>
  );
};

export default ProductTable;
