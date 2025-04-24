import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { IconButton, TextField } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { ProductsInCart } from "./cart.model";
import { appContext } from "../../appContext";
import { generateCustomID } from "../products/products.motor";
import { countNumberOfSameProducts, deleteProductFromCart } from "./cart.motor";
import { Product } from "../products/products.model";
import classes from "./css/edit-price-modal.module.css";

interface EditPriceModalProps {
	productInfo: ProductsInCart;
}

export const EditPriceModal: React.FC<EditPriceModalProps> = (props) => {
	const { desc, unit, id, category } = props.productInfo;
	const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;
	const [open, setOpen] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	const priceRef = React.useRef<HTMLInputElement>(null);

	const addCustomProduct = (e: React.FormEvent) => {
		e.preventDefault();
		const qtyOfOriginalItem = countNumberOfSameProducts(id, productsInCart);
		const cartWithoutOriginal = deleteProductFromCart(id, productsInCart);
		const newCustomId = generateCustomID(productsInCart);
		const newCustomProducts: Partial<Product>[] = [];
		for (let i = 0; i < qtyOfOriginalItem; i++) {
			newCustomProducts.push({
				name: desc,
				price: parseFloat(priceRef.current!.value),
				category_name: category,
				id: newCustomId,
			});
		}
		setProductsInCart([...cartWithoutOriginal, ...newCustomProducts as Product[]]);
		setOpen(false);
	};

	return (
		<>
			<IconButton onClick={handleOpen}>
				{" "}
				<EditIcon color="info" sx={{ fontSize: 16 }} />
			</IconButton>
			<Modal
				open={open}
				onClose={handleClose}
				aria-labelledby="modal-modal-title"
				aria-describedby="modal-modal-description"
			>
				<form onSubmit={addCustomProduct}>
				<Box className={classes["modal-style"]}>
						<Typography id="modal-modal-title" variant="h6" component="h2">
							<strong>Nuevo precio</strong>
						</Typography>

						<TextField
							id="product-name-required"
							label="Producto"
							variant="standard"
							size="small"
							margin="dense"
							defaultValue={desc}
							disabled
						/>
						<TextField
							required
							inputRef={priceRef}
							id="product-price-required"
							label="Precio"
							InputProps={{
								inputProps: { min: 0, step: "any" },
							}}
							variant="standard"
							size="small"
							margin="dense"
							type="number"
							defaultValue={unit.toFixed(2)}
						/>
						<Button
							size="small"
							color="success"
							variant="outlined"
							type="submit"
							sx={{ mt: 2 }}
						>
							Cambiar precio
						</Button>
					</Box>
				</form>
			</Modal>
		</>
	);
};
