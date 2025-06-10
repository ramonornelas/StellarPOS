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
import { formatCurrency } from "../../functions/generalFunctions";
import { featureFlags } from "../../config/featureFlags";

interface ProductCardProps {
	product: Product;
	onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
	const { name, stock_available, price, has_variants } = product;

	const numericPrice = Number(price) || 0;
	const formattedPrice = numericPrice === 0 ? "" : `${formatCurrency(numericPrice)}`;

	const createButton = () => {
		if (has_variants) {
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
				style={{ width: '200px', height: '200px', objectFit: 'cover' }}
			/>
			<CardContent className={classes["card-content"]}>
				<Typography
					gutterBottom
					variant="body2"
					component="h3"
					title={name}
					style={{
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						display: "block",
						maxWidth: "180px", // Adjust according to design
					}}
				>
					{name}
				</Typography>
				{featureFlags.productsCardShowStockAvailable && (
					<Typography gutterBottom variant="body2" component="h3">
						Disponible: {stock_available || 0}
					</Typography>
				)}
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