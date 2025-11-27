import { Container, Grid, useMediaQuery } from "@mui/material";
import { ProductsList } from "../components/products/products-list.component";
import React, { useEffect, useContext } from "react";
import { CartList } from "../components/cart/cart-list.component";
import classes from "./css/home.module.css";
import { useNavigate } from "react-router-dom";
import {
  getCashRegister,
  getOpenCashRegister,
} from "../functions/apiFunctions";
import { useBarcodeScanner } from "../components/products/useBarcodeScanner";
import { fetchProductByBarcode } from "../components/products/products-api";
import { updateCart } from "../components/cart/cart.utils";
import { appContext } from "../appContext";
import { DataContext } from "../dataContext";
import {
  openSnackBarBarcodeSuccess,
  openSnackBarBarcodeError,
} from "../components/snackbar/snackbar.motor";
import { featureFlags } from "../config/featureFlags";
import { useComboConfirmation } from "../components/cart/useComboConfirmation.hook";
import { groupProducts } from "../components/cart/cart.motor";

interface MainContainerProps {
  filter: string;
}

export const Home: React.FC<MainContainerProps> = (props) => {
  const { filter } = props;
  const navigate = useNavigate();

  // Hide CartList if viewport width is less than 1200px
  const hideCartList = useMediaQuery("(max-width:1199px)");

  // Get cart context and products
  const { productsInCart, setProductsInCart } = useContext(appContext).cartCTX;
  const products = useContext(DataContext).products;

  // Combo confirmation hook
  const { confirmComboDialog } = useComboConfirmation();

  // Handle barcode scanned from external scanner
  const handleBarcodeScanned = async (barcode: string) => {
    try {
      console.log("Barcode scanned:", barcode);

      // Fetch product from API by barcode
      const product = await fetchProductByBarcode(barcode);

      if (!product) {
        openSnackBarBarcodeError("Producto no encontrado");
        return;
      }

      // Check if product is active
      if (product.is_active === false) {
        openSnackBarBarcodeError("Producto no disponible");
        return;
      }

      // Add product to cart
      await updateCart(
        "add",
        productsInCart,
        setProductsInCart,
        products,
        product,
        confirmComboDialog
      );

      // Get the updated quantity for feedback
      const groupedProducts = groupProducts([...productsInCart, product]);
      const addedProduct = groupedProducts.find(
        (p) => p.product_variant_id === product.product_variant_id
      );
      const quantity = addedProduct?.qty || 1;

      // Show success feedback
      openSnackBarBarcodeSuccess(product.name, quantity);
    } catch (error: unknown) {
      console.error("Error processing barcode:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al escanear código de barras";
      openSnackBarBarcodeError(errorMessage);
    }
  };

  // Enable barcode scanner if feature flag is enabled
  useBarcodeScanner({
    onBarcodeScanned: handleBarcodeScanned,
    enabled: featureFlags.homeEnableBarcodeScanner,
  });

  useEffect(() => {
    const checkCashRegister = async () => {
      let cashRegisterId = sessionStorage.getItem("cashRegisterId");
      if (!cashRegisterId) {
        const openCashRegister = await getOpenCashRegister();
        if (openCashRegister && openCashRegister.id) {
          cashRegisterId = openCashRegister.id;
          sessionStorage.setItem("cashRegisterId", String(cashRegisterId));
        } else {
          navigate("/cash-register", {
            state: { message: "Debes abrir la caja para comenzar a operar." },
          });
          return;
        }
      }
      const cashRegister = await getCashRegister(cashRegisterId!);

      const cashRegisterDateString = cashRegister.date;
      const today = new Date();
      const todayString = today.toLocaleDateString("en-CA"); // 'YYYY-MM-DD'

      if (
        cashRegister &&
        cashRegister.status === "open" &&
        cashRegisterDateString !== todayString
      ) {
        // Open cash register from a previous day
        navigate("/cash-register", {
          state: {
            message:
              "Hay una caja abierta de un día anterior. Debes cerrarla para continuar.",
          },
        });
      }
    };
    checkCashRegister();
  }, [navigate]);

  return (
    <Container maxWidth="xl" className={classes["main-container"]}>
      <Grid container spacing={1}>
        <Grid item xl={8} lg={7} md={12} sm={12} xs={12}>
          <ProductsList filter={filter} />
        </Grid>
        {!hideCartList && (
          <Grid
            item
            xl={4}
            lg={5}
            md={12}
            sm={12}
            xs={12}
            className={classes["grid-items"]}
          >
            <CartList />
          </Grid>
        )}
      </Grid>
    </Container>
  );
};
