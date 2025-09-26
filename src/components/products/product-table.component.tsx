import React, { useEffect, useState } from "react";
import { fetchProducts, addProduct, updateProduct, deleteProduct } from "./products-api";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
import { Product } from "./products.model";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Checkbox } from "@mui/material";

const ProductTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [addMode, setAddMode] = useState(false);
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
    barcode: ""
  });

  useEffect(() => {
    fetchProducts().then((products) => {
      setProducts(products);
    });
  }, [refreshFlag]);

  const sortedProducts = React.useMemo(() => {
    if (!sortConfig) {
      // Default sort by name
      return [...products].sort((a, b) => {
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    }
    const { key, direction } = sortConfig;
    return [...products].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      if (key === 'price') {
        // Always sort price as number
        const aNum = typeof aValue === 'number' ? aValue : parseFloat(aValue as any);
        const bNum = typeof bValue === 'number' ? bValue : parseFloat(bValue as any);
        if (isNaN(aNum) && isNaN(bNum)) return 0;
        if (isNaN(aNum)) return 1;
        if (isNaN(bNum)) return -1;
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const cmp = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return direction === 'asc' ? cmp : -cmp;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return direction === 'asc' ? (aValue === bValue ? 0 : aValue ? -1 : 1) : (aValue === bValue ? 0 : aValue ? 1 : -1);
      }
      return 0;
    });
  }, [products, sortConfig]);

  const handleSort = (key: keyof Product) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleEdit = (id: string) => {
    const product = products.find((p) => p.id === id);
    setEditId(id);
    setEditData(product ? { ...product } : {});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setEditData((prev) => ({
      ...prev,
      [name!]: type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : name === 'price' && value === ''
          ? ''
          : value
    }));
  };


  const handleSave = async () => {
    if (!editId) return;
    try {
      await updateProduct(editId, editData);
    } catch (error) {
      alert('Hubo un error al actualizar el producto.');
    } finally {
      setEditId(null);
      setRefreshFlag((flag) => !flag);
    }
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setNewProduct((prev) => ({
      ...prev,
      [name!]: type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : name === 'price' && value === ''
          ? ''
          : value
    }));
  };


  const handleAdd = async () => {
    try {
      await addProduct(newProduct);
      openSnackBarProductAdded(newProduct.name || '', Number(newProduct.price) || 0);
    } catch (error) {
      alert('Hubo un error al agregar el producto.');
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
        barcode: ""
      });
      setRefreshFlag((flag) => !flag);
    }
  };

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    const name = product?.name || '';
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"?`)) return;
    try {
      await deleteProduct(id);
    } catch (error) {
      alert('Hubo un error al eliminar el producto.');
    } finally {
      setEditId(null);
      setRefreshFlag((flag) => !flag);
    }
  };

  return (
    <TableContainer component={Paper}>
      <Button variant="contained" color="primary" onClick={() => setAddMode(true)} style={{ margin: "10px" }}>
        Agregar Producto
      </Button>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ height: 32 }}>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('name')}>
              Nombre {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('price')}>
              Precio {sortConfig?.key === 'price' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ padding: '4px 8px', fontWeight: 'bold' }}>Imagen</TableCell>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('display_order')}>
              Orden {sortConfig?.key === 'display_order' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('has_variants')}>
              Variantes {sortConfig?.key === 'has_variants' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('is_combo')}>
              Combo {sortConfig?.key === 'is_combo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ cursor: 'pointer', padding: '4px 8px', fontWeight: 'bold' }} onClick={() => handleSort('is_active')}>
              Visible en caja {sortConfig?.key === 'is_active' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
            </TableCell>
            <TableCell style={{ padding: '4px 8px', fontWeight: 'bold' }}>Editar</TableCell>
            <TableCell style={{ padding: '4px 8px', fontWeight: 'bold' }}>Eliminar</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {addMode && (
            <TableRow sx={{ height: 32 }}>
              <TableCell style={{ padding: '4px 8px' }}>
                <TextField name="name" value={newProduct.name || ""} onChange={handleAddChange} size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <TextField name="price" value={newProduct.price === 0 ? '' : newProduct.price ?? ''} onChange={handleAddChange} type="number" size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <TextField name="image_url" value={newProduct.image_url || ''} onChange={handleAddChange} size="small" placeholder="URL" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <TextField name="display_order" value={newProduct.display_order ?? ''} onChange={handleAddChange} type="number" size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <Checkbox name="has_variants" checked={!!newProduct.has_variants} onChange={handleAddChange} size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <Checkbox name="is_combo" checked={!!newProduct.is_combo} onChange={handleAddChange} size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <Checkbox name="is_active" checked={!!newProduct.is_active} onChange={handleAddChange} size="small" />
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <Button onClick={handleAdd} color="success" size="small">Agregar</Button>
                <Button onClick={() => setAddMode(false)} color="error" size="small">Cancelar</Button>
              </TableCell>
              <TableCell />
            </TableRow>
          )}
          {sortedProducts.map((product) => (
            <TableRow key={product.id} sx={{ height: 32 }}>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <TextField name="name" value={editData.name || ""} onChange={handleChange} size="small" />
                ) : (
                  product.name
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <TextField name="price" value={editData.price === 0 ? '' : editData.price ?? ''} onChange={handleChange} type="number" size="small" />
                ) : (
                  product.price
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px', minWidth: 60 }}>
                {editId === product.id ? (
                  <TextField name="image_url" value={editData.image_url || ''} onChange={handleChange} size="small" placeholder="URL" />
                ) : (
                  product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 18 }}>?</span>
                    </div>
                  )
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <TextField name="display_order" value={editData.display_order ?? ''} onChange={handleChange} type="number" size="small" />
                ) : (
                  product.display_order
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <Checkbox name="has_variants" checked={!!editData.has_variants} onChange={handleChange} size="small" />
                ) : (
                  product.has_variants ? "Sí" : "No"
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <Checkbox name="is_combo" checked={!!editData.is_combo} onChange={handleChange} size="small" />
                ) : (
                  product.is_combo ? "Sí" : "No"
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <Checkbox name="is_active" checked={!!editData.is_active} onChange={handleChange} size="small" />
                ) : (
                  product.is_active ? "Sí" : "No"
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                {editId === product.id ? (
                  <>
                    <Button onClick={handleSave} color="success" size="small">Guardar</Button>
                    <Button onClick={() => setEditId(null)} color="error" size="small">Cancelar</Button>
                  </>
                ) : (
                  <Button onClick={() => handleEdit(product.id)} color="info" size="small">Editar</Button>
                )}
              </TableCell>
              <TableCell style={{ padding: '4px 8px' }}>
                <Button onClick={() => handleDelete(product.id)} color="error" size="small">Eliminar</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductTable;
