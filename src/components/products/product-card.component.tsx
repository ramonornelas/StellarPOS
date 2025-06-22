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

    const handleCardClick = () => {
        if (has_variants) {
            // Simulate click on SelectVariant to open
            document.getElementById(`select-variant-${product.id}`)?.click();
        } else {
            onAddToCart(product.id);
        }
    };

    const createButton = () => {
        if (has_variants) {
            return (
                <span
                    onClick={e => e.stopPropagation()}
                >
					<SelectVariant product={product} />
                </span>
            );
        } else {
            return (
                <Button
                    className={classes["card-actions-button"]}
                    size="small"
                    color="success"
                    variant="outlined"
                    onClick={e => {
                        e.stopPropagation();
                        onAddToCart(product.id);
                    }}
                >
                    Agregar
                </Button>
            );
        }
    };

    return (
        <Card
            className={classes["card"]}
            onClick={handleCardClick}
            style={{ cursor: "pointer" }}
        >
			<CardMedia
				component="img"
				alt={name}
				image={product.image_url}
				style={{ width: '180px', height: '180px', objectFit: 'cover' }}
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
						maxWidth: "180px",
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