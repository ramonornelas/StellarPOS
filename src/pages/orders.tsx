import React, { useState } from "react";
import { Box, Container, Typography, TextField } from "@mui/material";
import { useOrders, useOrdersSummary } from "../components/orders/orders.data";
import { OrderItem } from "../components/orders/order-item.component";
import { PaymentSummary } from "../components/orders/payment-summary.component";
import {
  ReturnModal,
  ReturnData,
} from "../components/orders/return-modal.component";
import { Order } from "../components/orders/order.model";
import { ordersByTicket } from "../components/orders/order.motor";
import { submitReturn } from "../functions/apiFunctions";
import {
  openSnackBarReturnSuccess,
  openSnackBarReturnError,
} from "../components/snackbar/snackbar.motor";
import classes from "./css/orders.module.css";
import { formatCurrency } from "../functions/generalFunctions";

export const Orders: React.FC = () => {
  // Usa la fecha de hoy como valor inicial por default
  const [selectedDate, setSelectedDateLocal] = useState<string>(() => {
    const today = new Date();
    // Ensure format YYYY-MM-DD in local timezone
    return today.toLocaleDateString("en-CA");
  });

  // Return modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] =
    useState<Order | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const dateString = selectedDate;
  const orders = useOrders(dateString);
  const { summary, loading: summaryLoading } = useOrdersSummary(dateString);
  const ordersSortedByTicket = ordersByTicket(orders, "desc");
  const totalSum = orders.reduce((sum, order) => sum + order.total, 0);

  // Maneja el cambio de fecha local
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSelectedDateLocal(value);
  };

  // Handle return button click
  const handleReturnClick = (order: Order) => {
    setSelectedOrderForReturn(order);
    setReturnModalOpen(true);
  };

  // Handle return modal close
  const handleReturnModalClose = () => {
    if (!returnLoading) {
      setReturnModalOpen(false);
      setSelectedOrderForReturn(null);
    }
  };

  // Handle return submission
  const handleReturnSubmit = async (returnData: ReturnData) => {
    setReturnLoading(true);

    try {
      // Get user_id from sessionStorage
      const userId = sessionStorage.getItem("stellar_userid");
      const cash_registerId = sessionStorage.getItem("cashRegisterId");

      if (!cash_registerId) {
        throw new Error("No se encontró el ID de la caja registradora.");
      }
      const returnPayload = {
        order_id: returnData.order_id,
        cash_register_id: cash_registerId,
        products: returnData.products.map((product) => ({
          id: product.id,
          variant_id: product.variant_id,
          quantity: product.quantity,
        })),
        refund_method: returnData.refund_method,
        notes: returnData.notes,
        user_id: userId || undefined,
      };

      const response = await submitReturn(returnPayload);

      if (response.status === "success") {
        openSnackBarReturnSuccess(response.data.total_amount);
        handleReturnModalClose();
      } else {
        openSnackBarReturnError(response.message || "Error desconocido");
      }
    } catch (error: unknown) {
      console.error("Error processing return:", error);
      const errorMessage = (() => {
        if (error instanceof Error) {
          return error.message;
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const response = (
            error as { response?: { data?: { message?: string } } }
          ).response;
          return response?.data?.message || "Error al procesar la devolución";
        }
        return "Error al procesar la devolución";
      })();
      openSnackBarReturnError(errorMessage);
    } finally {
      setReturnLoading(false);
    }
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
      <Typography variant="h5" component="h1" className={classes.header}>
        {orders.length === 0 ? `No hay ventas en el día` : `Ventas del día`}
      </Typography>
      <Typography variant="h5" component="h1" className={classes.header}>
        {totalSum > 0 ? `Total ${formatCurrency(totalSum)}` : ""}
      </Typography>

      <PaymentSummary summary={summary} loading={summaryLoading} />

      <Box className={classes["orders-container"]}>
        {ordersSortedByTicket.map((order) => (
          <OrderItem
            key={order.id}
            order={order}
            onReturnClick={handleReturnClick}
          />
        ))}
      </Box>

      <ReturnModal
        open={returnModalOpen}
        order={selectedOrderForReturn}
        onClose={handleReturnModalClose}
        onSubmit={handleReturnSubmit}
        loading={returnLoading}
      />
    </Container>
  );
};
