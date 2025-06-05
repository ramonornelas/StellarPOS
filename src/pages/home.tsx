import { Container, Grid } from "@mui/material";
import { ProductsList } from "../components/products/products-list.component";
import React, { useEffect } from "react";
import { CartList } from "../components/cart/cart-list.component";
import classes from "./css/home.module.css";
import { useNavigate } from "react-router-dom";
import { getCashRegister, getOpenCashRegister } from "../functions/apiFunctions";

interface MainContainerProps {
	filter: string;
}

export const Home: React.FC<MainContainerProps> = (props) => {
	const { filter } = props;
	const navigate = useNavigate();

	useEffect(() => {
		const checkCashRegister = async () => {
			let cashRegisterId = sessionStorage.getItem("cashRegisterId");
			if (!cashRegisterId) {
				// Look for an open cash register in the DB
				const openCashRegister = await getOpenCashRegister();
				if (openCashRegister && openCashRegister.id) {
					cashRegisterId = openCashRegister.id;
					sessionStorage.setItem("cashRegisterId", String(cashRegisterId));
				} else {
					navigate("/cash-register", {
						state: { message: "Debes abrir la caja para comenzar a operar." },
					});
					return;
				}
			}
			const cashRegister = await getCashRegister(cashRegisterId!);

			const cashRegisterDate = new Date(cashRegister.date);
			const today = new Date();

			const cashRegisterDateString = cashRegisterDate
				.toISOString()
				.slice(0, 10); // 'YYYY-MM-DD'
			const todayString = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

			if (
				cashRegister &&
				cashRegister.status === "open" &&
				cashRegisterDateString !== todayString
			) {
				// Open cash register from a previous day
				navigate("/cash-register", {
					state: {
						message:
							"Hay una caja abierta de un día anterior. Debes cerrarla para continuar.",
					},
				});
			}
		};
		checkCashRegister();
	}, [navigate]);

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
