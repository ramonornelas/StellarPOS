import React, { useContext } from "react";
import {
    Box,
    Container,
    Typography,
} from "@mui/material";
import { useOrders } from "../components/orders/orders.data";
import { OrderItem } from "../components/orders/order-item.component";
import { ordersByTicket } from "../components/orders/order.motor";
import classes from "./css/orders.module.css";
import { formatDate, formatCurrency } from "../functions/generalFunctions";
import { appContext } from "../appContext";

export const Orders: React.FC = () => {
    const { dateCTX } = useContext(appContext);
    const { selectedDate } = dateCTX;
    const dateString = selectedDate ? selectedDate.toLocaleDateString('en-CA') : "2024-12-31";
    const orders = useOrders(dateString);
    const ordersSortedByTicket = ordersByTicket(orders, "desc");
    const totalSum = orders.reduce((sum, order) => sum + order.total, 0);

    return (
        <Container maxWidth="xl" className={classes["main-container"]}>
            <Typography variant="h5" component="h1" className={classes.header} >
                {orders.length === 0 ? "No hay ventas para la fecha seleccionada." : `Ventas del día ${formatDate(dateString)}`}
            </Typography>
            <Typography variant="h5" component="h1" className={classes.header} >
                {totalSum > 0 ? `Total ${formatCurrency(totalSum)}` : ""}
            </Typography>
            <Box className={classes["orders-container"]}>
                {ordersSortedByTicket.map((order) => (
                    <OrderItem key={order.id} order={order} />
                ))}
            </Box>
        </Container>
    );
};