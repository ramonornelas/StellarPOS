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
import React from "react";
import { appContext } from "../../appContext";
import { EditPriceModal } from "./edit-price-modal.component";
import classes from "./css/cart-item.module.css";
import { openSnackBarDeleteProduct } from "../snackbar/snackbar.motor";
import { formatCurrency } from '../../functions/generalFunctions';

interface CartItemProps {
	productInfo: ProductsInCart;
}

export const CartItem: React.FC<CartItemProps> = (props) => {
	const { desc, qty, unit, category, product_variant_id } = props.productInfo;
	const { productsInCart, setProductsInCart } =
		React.useContext(appContext).cartCTX;

	const addQtyToCart = (id: string) => {
		const productFinded = searchProductByIdInCart(id, productsInCart);
		setProductsInCart([...productsInCart, productFinded]);
	};

	const subtractQtyFromCart = (id: string) => {
		const newProductsInCart = [...productsInCart];
		for (let i = newProductsInCart.length - 1; i >= 0; i--) {
			if (newProductsInCart[i].product_variant_id === id) {
				newProductsInCart.splice(i, 1);
				break;
			}
		}
		setProductsInCart(newProductsInCart);
	};

	const deleteFromCart = (id: string) => {
		const newProductsInCart = productsInCart.filter((p) => p.product_variant_id !== id);
		setProductsInCart(newProductsInCart);
	};

	return (
		<TableRow>
			<TableCell sx={{ p: 0, pl: 1 }}>
				<EditPriceModal productInfo={props.productInfo} />
				{formattedDescription(desc)}
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "left" }}>
					{<Typography
							component="p"
							variant="body2"
							className={classes["variant-label"]}
						>
						</Typography>
					}
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
					sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
				>
					<IconButton onClick={() => subtractQtyFromCart(product_variant_id)}>
						<RemoveCircleOutlineIcon className={classes.icon} />
					</IconButton>
					{qty}
					<IconButton onClick={() => addQtyToCart(product_variant_id)}>
						<AddCircleOutlineIcon className={classes.icon} />
					</IconButton>
				</Box>
			</TableCell>
			<TableCell align="right">{formatCurrency(unit)}</TableCell>
			<TableCell align="right">{formatCurrency(priceRow(qty, unit))}</TableCell>
			<TableCell align="right" sx={{ p: 0, pr: 1 }}>
				<IconButton
					onClick={() => {
						deleteFromCart(product_variant_id);
						openSnackBarDeleteProduct(desc);
					}}
				>
					<DeleteIcon className={classes["delete-icon"]} />
				</IconButton>
			</TableCell>
		</TableRow>
	);
};
