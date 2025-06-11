import {
	Box,
	Chip,
	IconButton,
	TableCell,
	TableRow,
	Typography,
} from "@mui/material";
import { ProductsInCart } from "./cart.model";
import {
	formattedDescription,
	priceRow,
	searchProductByIdInCart,
} from "./cart.motor";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import React, { useContext } from "react";
import { appContext } from "../../appContext";
import { EditPriceModal } from "./edit-price-modal.component";
import classes from "./css/cart-item.module.css";
import { openSnackBarDeleteProduct } from "../snackbar/snackbar.motor";
import { formatCurrency } from '../../functions/generalFunctions';
import { DataContext } from "../../dataContext";
import { updateCart } from "./cart.utils";
import { featureFlags } from "../../config/featureFlags";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

interface CartItemProps {
	productInfo: ProductsInCart;
}

export const CartItem: React.FC<CartItemProps> = (props) => {
    const { desc, qty, unit, category, product_variant_id, is_combo } = props.productInfo;
    const { productsInCart, setProductsInCart } =
        React.useContext(appContext).cartCTX;
    const products = useContext(DataContext).products;

    const [inputQty, setInputQty] = React.useState<string>(qty.toString());
    const [qtyError, setQtyError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setInputQty(qty.toString());
    }, [qty, productsInCart]);

    const addQtyToCart = (id: string) => {
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("add", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const substractQtyFromCart = (id: string) => {
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("subtract", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const deleteFromCart = (id: string) => {
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("delete", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(",", "."); // Allow comma or dot
        // Limit to a maximum of 3 decimals
        if (/^\d*\.?\d{0,3}$/.test(value) || value === "") {
            setInputQty(value);
        }
        // If the user tries to enter more than 3 decimals, ignore the change
    };

    const handleAcceptQty = () => {
        const floatValue = parseFloat(inputQty);

        if (floatValue === 0) {
            setQtyError("Invalid value");
            return;
        } else {
            setQtyError(null);
        }

        if (!isNaN(floatValue) && floatValue > 0 && floatValue !== qty) {
            const productFound = searchProductByIdInCart(product_variant_id, productsInCart);
            if (productFound) {
                updateCart("setQty", productsInCart, setProductsInCart, products, {
                    ...(productFound as any),
                    quantity: floatValue,
                });
            }
        }
    };

    return (
        <>
            <TableRow
                className={is_combo ? classes["highlight-row"] : ""}
                sx={{
                    ...(is_combo ? { backgroundColor: "#a2f6f5" } : {}),
                    height: 72, // Increase row height
                }}
            >
                <TableCell sx={{ p: 1.5, pl: 2 }}> {/* More padding */}
                    {featureFlags.cartItemShowEditPrice && (
                        <EditPriceModal productInfo={props.productInfo} />
                    )}
                    <Tooltip title={desc} arrow>
                        <span>{formattedDescription(desc)}</span>
                    </Tooltip>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "left" }}>
                        {<Typography
                            component="p"
                            variant="body2"
                            className={classes["variant-label"]}
                        >
                        </Typography>}
                        {(category === "custom") && (
                            <Typography
                                component="p"
                                variant="body2"
                                className={classes["custom-label"]}
                            >
                                {" "}
                                <Chip
                                    color="info"
                                    variant="outlined"
                                    label="Custom"
                                    sx={{ height: "auto", m: 0.5 }}
                                />
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1.5, // Space between buttons
                        }}
                    >
                        <>
                            <IconButton
                                onClick={() => substractQtyFromCart(product_variant_id)}
                                size="medium"
                                sx={{ width: 40, height: 40 }}
                                color="primary"
                            >
                                <RemoveCircleIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                            <TextField
                                type="number"
                                variant="standard"
                                value={inputQty}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleAcceptQty();
                                    }
                                }}
                                error={!!qtyError}
                                helperText={qtyError ?? " "}
                                FormHelperTextProps={{
                                    style: { minHeight: 20, margin: 0, padding: 0 },
                                }}
                                inputProps={{
                                    min: 0.01,
                                    step: "any",
                                    inputMode: "decimal",
                                    style: { textAlign: "center", width: 70, padding: 0, fontSize: 20 },
                                    className: classes["no-spinner"],
                                }}
                            />
                            <IconButton
                                onClick={() => addQtyToCart(product_variant_id)}
                                size="medium"
                                sx={{ width: 40, height: 40 }}
                                color="primary"
                            >
                                <AddCircleIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                        </>
                    </Box>
                </TableCell>
                <TableCell align="right">{formatCurrency(unit)}</TableCell>
                <TableCell align="right">{formatCurrency(priceRow(qty, unit))}</TableCell>
                <TableCell align="right" sx={{ p: 1.5, pr: 2 }}>
                    <IconButton
                        onClick={() => {
                            deleteFromCart(product_variant_id);
                            openSnackBarDeleteProduct(desc);
                        }}
                        size="medium"
                        sx={{ width: 40, height: 40 }}
                        color="error"
                    >
                        <DeleteIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                </TableCell>
            </TableRow>
        </>
    );
};
