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

interface SelectVariantProps {
	product: Product;
}

export const SelectVariant: React.FC<SelectVariantProps> = (props) => {
	const ProductVariants = useContext(DataContext).productVariants;
	const products = useContext(DataContext).products;
	const { product } = props;
	const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;

	const [open, setOpen] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => {
		setOpen(false);
	};

	const addCustomProduct = (selectedOption: string) => {
			const productFound = searchVariantById(ProductVariants, selectedOption);

			// Combine product.name and productFound.name
			const combinedproductFound = {
				...productFound,
				id: product.id,
				product_variant_id: productFound.id,
				name: `${product.name} ${productFound.name}`,
				image_url: "",
				is_combo: false,
				is_active: true,
			};

			updateCart("add", productsInCart, setProductsInCart, products, combinedproductFound);
			openSnackBarProductAdded(combinedproductFound.name, productFound.price);
			setOpen(false);
	};

	return (
		<div>
			<Button
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
							{ProductVariants
								.filter(variant => product.id === variant.product_id)
								.sort((a, b) => a.display_order - b.display_order)
								.map((variant) => (
									<Button
										color="success"
										size="small"
										variant="outlined"
										key={variant.id}
										value={variant.id}
										onClick={() => addCustomProduct(variant.id)}
										style={{ margin: '8px' }}
										fullWidth
									>
										<Box display="flex" width="100%" justifyContent="space-between" alignItems="center">
											<span>{variant.name}</span>
											<span>{formatCurrency(variant.price)}</span>
										</Box>
									</Button>
								))
							}
						</ToggleButtonGroup>
					</Box>
				</form>
			</Modal>
		</div>
	);
};
