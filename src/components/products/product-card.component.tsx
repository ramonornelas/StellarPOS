import {
	Button,
	Card,
	CardActions,
	CardContent,
	CardMedia,
	Typography,
} from "@mui/material";
import { Product } from "./products.model";
import classes from "./css/products-card.module.css";
import { SelectVariant } from "./modal-select-variant.component";
import React from "react";
import { openSnackBarProductAdded } from "../snackbar/snackbar.motor";
import { formatCurrency } from "../../functions/generalFunctions";

interface ProductCardProps {
	product: Product;
	onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
	const { name, price, has_variants } = product; // Updated property name
	
	const numericPrice = Number(price) || 0;
	const formattedPrice = numericPrice === 0 ? "" : `${formatCurrency(numericPrice)}`;

	const createButton = () => {
			if (has_variants) { // Updated property name
					return <SelectVariant product={product} />;
			} else {
					return (
							<Button
									className={classes["card-actions-button"]}
									size="small"
									color="success"
									variant="outlined"
									onClick={() => {
											onAddToCart(product.id);
											openSnackBarProductAdded(name, numericPrice);
									}}
							>
									Agregar
							</Button>
					);
			}
	};

	return (
			<Card className={classes["card"]}>
					<CardMedia
							component="img"
							alt={name}
							image={product.image_url}
							style={{ width: '200px', height: '200px', objectFit: 'cover' }} // Set fixed width and height
					/>
					<CardContent className={classes["card-content"]}>
							<Typography gutterBottom variant="body2" component="h3">
									{name}
							</Typography>
					</CardContent>
					<CardActions className={classes["card-actions"]}>
							<Typography gutterBottom variant="body2" component="p">
									{formattedPrice}
							</Typography>
							{createButton()}
					</CardActions>
			</Card>
	);
};