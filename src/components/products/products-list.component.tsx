import React, { useContext, useState, useEffect } from "react";
import { Box, Grid, Paper, Typography, Button } from "@mui/material";
import {
  returnCategoryName,
  searchProductById,
  searchProductByBarcode,
} from "./products.motor";
import { ProductCard } from "./product-card.component";
import classes from "./css/products-list.module.css";
import { BasicModal } from "./modal-add-product.component";
import { appContext } from "../../appContext";
import { DataContext } from "../../dataContext";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { updateCart } from "../cart/cart.utils";
import { featureFlags } from "../../config/featureFlags";
import { useProductSearch } from "./useProductSearch";
import { useComboConfirmation } from "../cart/useComboConfirmation.hook";
import { ComboConfirmationDialog } from "../cart/combo-confirmation-dialog.component";

interface ProductsListProps {
  filter: string;
}

export const ProductsList: React.FC<ProductsListProps> = (props) => {
  const { filter } = props;
  const products = useContext(DataContext).products;
  const categoryName = <strong>{returnCategoryName(filter)}</strong>;
  const { productsInCart, setProductsInCart } =
    React.useContext(appContext).cartCTX;
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");

  const { filteredProducts, hasSearchTerm, searchTerm } = useProductSearch(
    products,
    filter
  );

  const {
    confirmComboDialog,
    handleConfirm,
    handleCancel,
    dialogOpen,
    combos,
  } = useComboConfirmation();

  const addProductToCart = async (product: any) => {
    await updateCart(
      "add",
      productsInCart,
      setProductsInCart,
      products,
      product,
      confirmComboDialog
    );
    openSnackBarProductAdded(product.name, product.price);
  };

  const handleAddToCart = async (id: string) => {
    const productFound = searchProductById(products, id);
    await addProductToCart(productFound);
  };

  const handleAddToCartByBarcode = async (barcode: string) => {
    const productFound = searchProductByBarcode(products, barcode);
    if (productFound) {
      await addProductToCart(productFound);
      setShowScanner(false); // Hide the scanner when a product is found
    } else {
      console.error(`Error: Product with barcode ${barcode} not found.`);
    }
  };

  const handleScanBarcode = () => {
    setShowScanner(!showScanner);
  };

  useEffect(() => {
    if (scannedCode) {
      console.log("Scanned code:", scannedCode);
    }
  }, [scannedCode]);

  const handleScan = async (err: unknown, result: any) => {
    if (err) {
      console.error("Error scanning barcode:", err);
      return;
    }
    if (result?.text) {
      setScannedCode(result.text);
      await handleAddToCartByBarcode(result.text);
    }
  };

  return (
    <Paper className={classes["products-container"]} elevation={5} square>
      <Box className={classes["title-container"]}>
        {filter !== "all" && (
          <Typography
            className={classes["products-title"]}
            variant="h6"
            component="h2"
          >
            Categoría: {categoryName}
          </Typography>
        )}
        <BasicModal />
      </Box>
      {hasSearchTerm && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {filteredProducts.length === 0
              ? `No se encontraron productos que coincidan con "${searchTerm}"`
              : `${filteredProducts.length} producto${
                  filteredProducts.length !== 1 ? "s" : ""
                } encontrado${
                  filteredProducts.length !== 1 ? "s" : ""
                } para "${searchTerm}"`}
          </Typography>
        </Box>
      )}
      {featureFlags.productsListShowBarcodeScanner && (
        <p>
          <Button
            variant="contained"
            color="primary"
            onClick={handleScanBarcode}
          >
            {showScanner ? "Ocultar escáner" : "Leer código de barras"}
          </Button>
        </p>
      )}
      {featureFlags.productsListShowBarcodeScanner && showScanner && (
        <BarcodeScannerComponent
          width={350}
          height={300}
          onUpdate={handleScan}
        />
      )}
      <Grid container spacing={2}>
        {filteredProducts.length === 0 && hasSearchTerm ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No se encontraron productos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Intenta con otros términos de búsqueda o cambia de categoría
              </Typography>
            </Box>
          </Grid>
        ) : (
          filteredProducts.map((product) => (
            <Grid key={product.id} item xs={12} sm={6} md={2.4} lg={2.2} xl={2}>
              <ProductCard product={product} onAddToCart={handleAddToCart} />
            </Grid>
          ))
        )}
      </Grid>

      {/* Dialog de confirmación para combos */}
      <ComboConfirmationDialog
        open={dialogOpen}
        combos={combos}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Paper>
  );
};
