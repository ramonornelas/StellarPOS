import React, { useContext, useState, useEffect } from "react";
import { Box, Grid, Paper, Typography, Button } from "@mui/material";
import { filterProducts, returnCategoryName, searchProductById, searchProductByBarcode } from "./products.motor";
import { ProductCard } from "./product-card.component";
import classes from "./css/products-list.module.css";
import { BasicModal } from "./modal-add-product.component";
import { appContext } from "../../appContext";
import { DataContext } from "../../dataContext";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

interface ProductsListProps {
    filter: string;
}

export const ProductsList: React.FC<ProductsListProps> = (props) => {
    const { filter } = props;
    const products = useContext(DataContext).products;
    const productsFiltered = filterProducts(products, filter);
    const categoryName = <strong>{returnCategoryName(filter)}</strong>;
    const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;
    const [showScanner, setShowScanner] = useState(false);
    const [scannedCode, setScannedCode] = useState("");

    const addProductToCart = (product: any) => {
        setProductsInCart([...productsInCart, product]);
        openSnackBarProductAdded(product.name, product.price);
    };

    const handleAddToCart = (id: string) => {
        const productFinded = searchProductById(products, id);
        addProductToCart(productFinded);
    };

    const handleAddToCartByBarcode = (barcode: string) => {
        const productFinded = searchProductByBarcode(products, barcode);
        if (productFinded) {
            addProductToCart(productFinded);
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

    const handleScan = (err: unknown, result: any) => {
        if (err) {
            console.error("Error scanning barcode:", err);
            return;
        }
        if (result?.text) {
            setScannedCode(result.text);
            handleAddToCartByBarcode(result.text);
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
            <p>
                <Button variant="contained" color="primary" onClick={handleScanBarcode}>
                    {showScanner ? "Ocultar escáner" : "Leer código de barras"}
                </Button>
            </p>
            {showScanner && (
                <BarcodeScannerComponent width={350} height={300} onUpdate={handleScan} />
            )}
            <Grid container spacing={2}>
                {productsFiltered
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((product, index) => (
                        <Grid key={index} item xl={2} lg={3} md={4} sm={3} xs={6}>
                            <ProductCard product={product} onAddToCart={handleAddToCart} />
                        </Grid>
                    ))}
            </Grid>
        </Paper>
    );
};