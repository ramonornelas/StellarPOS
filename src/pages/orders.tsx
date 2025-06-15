import React, { useState } from "react";
import {
    Box,
    Container,
    Typography,
    TextField,
} from "@mui/material";
import { useOrders } from "../components/orders/orders.data";
import { OrderItem } from "../components/orders/order-item.component";
import { ordersByTicket } from "../components/orders/order.motor";
import classes from "./css/orders.module.css";
import { formatCurrency } from "../functions/generalFunctions";

export const Orders: React.FC = () => {
    // Usa la fecha de hoy como valor inicial por default
    const [selectedDate, setSelectedDateLocal] = useState<string>(() => {
        const today = new Date();
        // Ensure format YYYY-MM-DD in local timezone
        return today.toLocaleDateString("en-CA");
    });

    const dateString = selectedDate;
    const orders = useOrders(dateString);
    const ordersSortedByTicket = ordersByTicket(orders, "desc");
    const totalSum = orders.reduce((sum, order) => sum + order.total, 0);

    // Maneja el cambio de fecha local
    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSelectedDateLocal(value);
    };

    return (
        <Container maxWidth="xl" className={classes["main-container"]}>
            <Box mb={2}>
                <TextField
                    label="Selecciona la fecha"
                    type="date"
                    value={dateString}
                    onChange={handleDateChange}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    size="small"
                />
            </Box>
            <Typography variant="h5" component="h1" className={classes.header} >
                {orders.length === 0 ? `No hay ventas en el día` : `Ventas del día`}
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