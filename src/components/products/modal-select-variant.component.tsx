import React, { useContext } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { appContext } from "../../appContext";
import { Product } from "./products.model";
import { searchVariantById } from "./products.motor";
import { ToggleButtonGroup } from "@mui/material";
import classes from "./css/modal-select-variant.module.css";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
import { DataContext } from "../../dataContext";
import { formatCurrency } from "../../functions/generalFunctions";
import { updateCart } from "../cart/cart.utils";
import { useComboConfirmation } from "../cart/useComboConfirmation.hook";
import { ComboConfirmationDialog } from "../cart/combo-confirmation-dialog.component";

interface SelectVariantProps {
  product: Product;
}

export const SelectVariant: React.FC<SelectVariantProps> = (props) => {
  const ProductVariants = useContext(DataContext).productVariants;
  const products = useContext(DataContext).products;
  const { product } = props;
  const { productsInCart, setProductsInCart } =
    React.useContext(appContext).cartCTX;

  const {
    confirmComboDialog,
    handleConfirm,
    handleCancel,
    dialogOpen,
    combos,
  } = useComboConfirmation();

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
  };

  const addCustomProduct = async (selectedOption: string) => {
    const productFound = searchVariantById(ProductVariants, selectedOption);

    // Convert price to number
    const numericPrice =
      typeof productFound.price === "string"
        ? parseFloat(productFound.price)
        : productFound.price;

    // Combine product.name and productFound.name
    const combinedproductFound: Product = {
      ...productFound,
      id: product.id,
      product_variant_id: productFound.id,
      name: `${product.name} ${productFound.name}`,
      image_url: "",
      is_combo: false,
      is_active: true,
      price: numericPrice,
      category_id: productFound.category_id || product.category_id,
      category_name: productFound.category_name || product.category_name,
      has_variants: false,
      description: productFound.description || "",
      display_order:
        typeof productFound.display_order === "string"
          ? parseInt(productFound.display_order)
          : productFound.display_order,
      stock_available:
        typeof productFound.stock_available === "string"
          ? parseFloat(productFound.stock_available)
          : productFound.stock_available,
      barcode: "",
    };

    await updateCart(
      "add",
      productsInCart,
      setProductsInCart,
      products,
      combinedproductFound,
      confirmComboDialog
    );
    openSnackBarProductAdded(combinedproductFound.name, numericPrice);
    setOpen(false);
  };

  return (
    <div>
      <Button
        id={`select-variant-${product.id}`}
        className={classes["select-button"]}
        size="small"
        color="success"
        variant="outlined"
        onClick={handleOpen}
      >
        Elegir
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <form>
          <Box className={classes["modal-style"]}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              <strong>{product.name}</strong>
            </Typography>
            <Typography
              id="modal-modal-title"
              variant="body2"
              component="h2"
              className={classes["modal-title"]}
            >
              <strong>Selecciona una opción:</strong>
            </Typography>
            <Box mt={2} />
            <ToggleButtonGroup
              className={classes["toggle-button-group"]}
              color="primary"
              exclusive
              aria-label="Product Variant"
              orientation="vertical"
            >
              {ProductVariants.filter(
                (variant) => product.id === variant.product_id
              )
                .sort((a, b) => {
                  const aOrder =
                    typeof a.display_order === "string"
                      ? parseInt(a.display_order)
                      : a.display_order;
                  const bOrder =
                    typeof b.display_order === "string"
                      ? parseInt(b.display_order)
                      : b.display_order;
                  return aOrder - bOrder;
                })
                .map((variant) => (
                  <Button
                    color="success"
                    size="small"
                    variant="outlined"
                    key={variant.id}
                    value={variant.id}
                    onClick={() => addCustomProduct(variant.id)}
                    style={{ margin: "8px" }}
                    fullWidth
                  >
                    <Box
                      display="flex"
                      width="100%"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <span>{variant.name}</span>
                      <span>
                        {formatCurrency(
                          typeof variant.price === "string"
                            ? parseFloat(variant.price)
                            : variant.price
                        )}
                      </span>
                    </Box>
                  </Button>
                ))}
            </ToggleButtonGroup>
          </Box>
        </form>
      </Modal>

      {/* Dialog de confirmación para combos */}
      <ComboConfirmationDialog
        open={dialogOpen}
        combos={combos}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};
