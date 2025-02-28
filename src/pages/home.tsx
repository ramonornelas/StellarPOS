import { Container, Grid } from "@mui/material";
import { ProductsList } from "../components/products/products-list.component";
import React from "react";
import { CartList } from "../components/cart/cart-list.component";
import classes from "./css/home.module.css";

interface MainContainerProps {
	filter: string;
}

export const Home: React.FC<MainContainerProps> = (props) => {
	const { filter } = props;

	return (
		<Container maxWidth="xl" className={classes["main-container"]}>
			<Grid container spacing={1}>
				<Grid item xl={8} lg={7} md={6} sm={12}>
					<ProductsList filter={filter} />
				</Grid>
				<Grid item xl={4} lg={5} md={6} className={classes["grid-items"]}>
					<CartList />
				</Grid>
			</Grid>
		</Container>
	);
};
