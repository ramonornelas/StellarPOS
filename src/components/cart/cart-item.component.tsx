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
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
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
        console.log("[useEffect] qty prop changed:", qty);
        setInputQty(qty.toString());
    }, [qty]);

    const addQtyToCart = (id: string) => {
        console.log("[addQtyToCart] id:", id);
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("add", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const substractQtyFromCart = (id: string) => {
        console.log("[substractQtyFromCart] id:", id);
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("subtract", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const deleteFromCart = (id: string) => {
        console.log("[deleteFromCart] id:", id);
        const productFound = searchProductByIdInCart(id, productsInCart);
        if (productFound) {
            updateCart("delete", productsInCart, setProductsInCart, products, productFound);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(",", "."); // Permite coma o punto
        // Limita a máximo 3 decimales
        if (/^\d*\.?\d{0,3}$/.test(value) || value === "") {
            setInputQty(value);
        }
        // Si el usuario intenta escribir más de 3 decimales, ignora el cambio
    };

    const handleAcceptQty = () => {
        const floatValue = parseFloat(inputQty);
        console.log("[handleAcceptQty] inputQty:", inputQty, "floatValue:", floatValue, "qty:", qty);

        if (floatValue === 0) {
            setQtyError("Valor inválido");
            return;
        } else {
            setQtyError(null);
        }

        if (!isNaN(floatValue) && floatValue > 0 && floatValue !== qty) {
            const productFound = searchProductByIdInCart(product_variant_id, productsInCart);
            console.log("[handleAcceptQty] productFound:", productFound);
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
                    height: 72, // Aumenta la altura del renglón
                }}
            >
                <TableCell sx={{ p: 1.5, pl: 2 }}> {/* Más padding */}
                    {featureFlags.cartItemShowEditPrice && (
                        <EditPriceModal productInfo={props.productInfo} />
                    )}
                    {formattedDescription(desc)}
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
                            gap: 1.5, // Espacio entre botones
                        }}
                    >
                        <>
                            <IconButton
                                onClick={() => substractQtyFromCart(product_variant_id)}
                                size="large"
                            >
                                <RemoveCircleOutlineIcon className={classes.icon} fontSize="large" />
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
                                helperText={qtyError ?? " "} // Espacio en blanco cuando no hay error
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
                                size="large"
                            >
                                <AddCircleOutlineIcon className={classes.icon} fontSize="large" />
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
                        size="large"
                    >
                        <DeleteIcon className={classes["delete-icon"]} fontSize="large" />
                    </IconButton>
                </TableCell>
            </TableRow>
        </>
    );
};
