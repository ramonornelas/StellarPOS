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

interface SelectVariantProps {
	product: Product;
}

export const SelectVariant: React.FC<SelectVariantProps> = (props) => {
	const ProductVariants = useContext(DataContext).productVariants;
	const { product } = props;
	const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;

	const [open, setOpen] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => {
		setOpen(false);
	};

	const addCustomProduct = (selectedOption: string) => {
			const productFinded = searchVariantById(ProductVariants, selectedOption);

			// Combine product.name and productFinded.name
			const combinedProductFinded = {
				...productFinded,
				id: product.id,
				product_variant_id: productFinded.id,
				name: `${product.name} ${productFinded.name}`,
				image_url: "",
				is_combo: false
			};

			setProductsInCart([...productsInCart, combinedProductFinded]);
			openSnackBarProductAdded(combinedProductFinded.name, productFinded.price);
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
									>
										{variant.name} <br></br> {formatCurrency(variant.price)}
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
