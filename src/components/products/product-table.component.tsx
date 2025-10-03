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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { formatCurrency } from "../../functions/generalFunctions";

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

  useEffect(() => {
    fetchProducts().then((products) => {
      setProducts(products);
    });
  }, [refreshFlag]);

  const filteredAndSortedProducts = React.useMemo(() => {
    // Función para normalizar texto (remover acentos y convertir a minúsculas)
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remover acentos
    };

    // Función para filtrar productos por texto
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

    // Primero filtrar productos según el toggle
    let filtered = showOnlyVisible
      ? products.filter((product) => product.is_active)
      : products;

    // Luego filtrar por término de búsqueda
    filtered = filterProductsBySearch(filtered, searchTerm);

    if (!sortConfig) {
      // Default sort by name
      return [...filtered].sort((a, b) => {
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
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

  // Función para manejar upload de imágenes
  const handleImageUpload = async (file: File, productId: string) => {
    // Limpiar errores previos
    setUploadErrors((prev) => ({ ...prev, [productId]: "" }));

    // Marcar como cargando
    setUploadingImages((prev) => ({ ...prev, [productId]: true }));

    try {
      const response = await uploadProductImage(file);

      if (response.statusCode === 200 && response.data?.image_url) {
        // Actualizar la URL de imagen en editData
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

  // Función para manejar selección de archivo
  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    productId: string
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file, productId);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    event.target.value = "";
  };

  // Función para manejar upload de imágenes para producto nuevo
  const handleImageUploadForNew = async (file: File) => {
    // Limpiar errores previos
    setUploadErrors((prev) => ({ ...prev, ["new"]: "" }));

    // Marcar como cargando
    setUploadingImages((prev) => ({ ...prev, ["new"]: true }));

    try {
      const response = await uploadProductImage(file);

      if (response.statusCode === 200 && response.data?.image_url) {
        // Actualizar la URL de imagen en newProduct
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

  // Función para manejar selección de archivo para producto nuevo
  const handleFileSelectForNew = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUploadForNew(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    event.target.value = "";
  };

  return (
    <TableContainer component={Paper}>
      <Box sx={{ margin: "10px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => setAddMode(true)}
          >
            Agregar Producto
          </Button>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              minWidth: { xs: "auto", md: 300 }, // minWidth para desktop
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
            {searchTerm && (
              <Typography variant="caption" color="text.secondary">
                {filteredAndSortedProducts.length === 0
                  ? `No se encontraron productos que coincidan con "${searchTerm}"`
                  : `${filteredAndSortedProducts.length} producto${
                      filteredAndSortedProducts.length !== 1 ? "s" : ""
                    } encontrado${
                      filteredAndSortedProducts.length !== 1 ? "s" : ""
                    }`}
              </Typography>
            )}
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
              flexDirection: "column",
              margin: "0px",
            }}
            label="Solo visibles en caja"
          />
        </Box>
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
              Editar
            </TableCell>
            <TableCell style={{ padding: "4px 8px", fontWeight: "bold" }}>
              Eliminar
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
                  {/* Campo de URL manual */}
                  <TextField
                    name="image_url"
                    value={newProduct.image_url || ""}
                    onChange={handleAddChange}
                    size="small"
                    placeholder="URL de imagen"
                    sx={{ minWidth: 150 }}
                  />

                  {/* Botón para subir archivo */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
              <TableCell style={{ padding: "4px 8px" }}>
                <TextField
                  name="price"
                  value={newProduct.price === 0 ? "" : newProduct.price ?? ""}
                  onChange={handleAddChange}
                  type="number"
                  size="small"
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
                <Button onClick={handleAdd} color="success" size="small">
                  Agregar
                </Button>
                <Button
                  onClick={() => setAddMode(false)}
                  color="error"
                  size="small"
                >
                  Cancelar
                </Button>
              </TableCell>
              <TableCell />
            </TableRow>
          )}
          {filteredAndSortedProducts.map((product) => (
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
                    {/* Campo de URL manual */}
                    <TextField
                      name="image_url"
                      value={editData.image_url || ""}
                      onChange={handleChange}
                      size="small"
                      placeholder="URL de imagen"
                      sx={{ minWidth: 150 }}
                    />

                    {/* Botón para subir archivo */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                    {/* Error de upload */}
                    {uploadErrors[product.id] && (
                      <Alert
                        severity="error"
                        sx={{ fontSize: "0.7rem", py: 0 }}
                      >
                        {uploadErrors[product.id]}
                      </Alert>
                    )}

                    {/* Preview de imagen */}
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
                ) : product.has_variants ? (
                  "Sí"
                ) : (
                  "No"
                )}
              </TableCell>
              <TableCell style={{ padding: "4px 8px" }}>
                {editId === product.id ? (
                  <TextField
                    name="price"
                    value={editData.price === 0 ? "" : editData.price ?? ""}
                    onChange={handleChange}
                    type="number"
                    size="small"
                  />
                ) : (
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
                ) : product.is_combo ? (
                  "Sí"
                ) : (
                  "No"
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
                ) : product.is_active ? (
                  "Sí"
                ) : (
                  "No"
                )}
              </TableCell>
              <TableCell style={{ padding: "4px 8px" }}>
                {editId === product.id ? (
                  <>
                    <Button onClick={handleSave} color="success" size="small">
                      Guardar
                    </Button>
                    <Button
                      onClick={() => setEditId(null)}
                      color="error"
                      size="small"
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleEdit(product.id)}
                    color="info"
                    size="small"
                  >
                    Editar
                  </Button>
                )}
              </TableCell>
              <TableCell style={{ padding: "4px 8px" }}>
                <Button
                  onClick={() => handleDelete(product.id)}
                  color="error"
                  size="small"
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductTable;
