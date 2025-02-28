import React from "react";
import { Container, Typography } from "@mui/material";
import { CartList } from "../components/cart/cart-list.component";
import classes from "./css/cart.module.css"

export const CartPage: React.FC = () => {
	return (
		<Container maxWidth="xl" className={classes["main-container"]}>
			<Typography variant="h5" component="h1" sx={{mb:1}}>Productos en comanda</Typography>
			<CartList />
		</Container>
	);
};
