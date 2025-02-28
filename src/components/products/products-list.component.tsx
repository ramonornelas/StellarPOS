import { Box, Grid, Paper, Typography } from "@mui/material";
import {
    filterProducts,
    returnCategoryName,
} from "./products.motor";
import { ProductCard } from "./product-card.component";
import classes from "./css/products-list.module.css";
import { BasicModal } from "./modal-add-product.component";
import React, { useContext } from "react";
import { searchProductById } from "./products.motor";
import { appContext } from "../../appContext";
import { DataContext } from "../../dataContext";

interface ProductsListProps {
    filter: string;
}

export const ProductsList: React.FC<ProductsListProps> = (props) => {
    const { filter } = props;
    const products = useContext(DataContext).products;
    const productsFiltered = filterProducts(products, filter);
    const categoryName = <strong>{returnCategoryName(filter)}</strong>;
	const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;

    const handleAddToCart = (id: string) => {
        const productFinded = searchProductById(products, id);
        setProductsInCart([...productsInCart, productFinded]);
    };

    return (
        <Paper className={classes["products-container"]} elevation={5} square>
            <Box className={classes["title-container"]}>
                <Typography
                    className={classes["products-title"]}
                    variant="h6"
                    component="h2"
                >
                    Categoría: {categoryName}
                </Typography>
                <BasicModal />
            </Box>
            <Grid container spacing={2}>
                {productsFiltered
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((product, index) => (
                        <Grid key={index} item xl={2} lg={3} md={4} sm={3} xs={6}>
                            <ProductCard product={product} onAddToCart={handleAddToCart} />
                        </Grid>
                    ))}
            </Grid>
        </Paper>
    );
};