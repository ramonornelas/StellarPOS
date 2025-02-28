import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { groupProducts, isCartEmpty } from "./cart.motor";
import { CartItem } from "./cart-item.component";
import { Box } from "@mui/material";
import classes from "./css/cart-list.module.css";
import { CalcTotal } from "./calc-total.component";
import { appContext } from "../../appContext";
import { useLocation } from 'react-router-dom';

export const CartList: React.FC = () => {
	const { productsInCart } = React.useContext(appContext).cartCTX;
	const productsGrouped = groupProducts(productsInCart);
	const location = useLocation();

	const isUserInHome = () => {
		return location.pathname === "/";
	}

	return (
		<Box sx={{ flexGrow: 1 }}>
			<TableContainer
				component={Paper}
				className={classes["cart-container"]}
				elevation={5}
				square
			>
				<Table aria-label="spanning table" className={(isCartEmpty(productsInCart) && isUserInHome()) ? classes["table-body"] : ""}>
					<TableHead>
						<TableRow className={classes["table-header"]}>
							<TableCell>Producto</TableCell>
							<TableCell align="center">Cant.</TableCell>
							<TableCell align="right">Precio</TableCell>
							<TableCell align="right">Suma</TableCell>
							<TableCell align="right"></TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{productsGrouped.map((row) => (
							<CartItem
								key={`${row.id}-${row.product_variant_id}`}
								productInfo={row}
							/>
						))}
					</TableBody>
				</Table>
			</TableContainer>
			<CalcTotal/>
		</Box>
	);
};
