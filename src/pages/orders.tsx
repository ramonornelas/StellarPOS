import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  useOrders,
  useOrdersSummary,
  useReturns,
  useReturnsSummary,
} from "../components/orders/orders.data";
import { OrderItem } from "../components/orders/order-item.component";
import { ReturnItem } from "../components/orders/return-item.component";
import { PaymentSummary } from "../components/orders/payment-summary.component";
import { ReturnsSummaryCard } from "../components/orders/returns-summary.component";
import { SalesDifferenceCard } from "../components/orders/sales-difference-card.component";
import { ReturnModal } from "../components/orders/return-modal.component";
import { ProcessedOrder, ReturnData } from "../types/order";
import { ordersByTicket } from "../components/orders/order.motor";
import { submitReturn } from "../functions/apiFunctions";
import {
  openSnackBarReturnSuccess,
  openSnackBarReturnError,
} from "../components/snackbar/snackbar.motor";
import classes from "./css/orders.module.css";

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
    useState<ProcessedOrder | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  // Section expansion state (both expanded by default)
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [returnsExpanded, setReturnsExpanded] = useState(true);

  // View mode state (simple view by default, with persistence)
  const [isDetailedView, setIsDetailedView] = useState<boolean>(() => {
    const saved = localStorage.getItem("ordersViewMode");
    return saved !== null ? saved === "detailed" : false;
  });

  // Save view preference to localStorage
  useEffect(() => {
    localStorage.setItem(
      "ordersViewMode",
      isDetailedView ? "detailed" : "simple"
    );
  }, [isDetailedView]);

  const dateString = selectedDate;

  // Orders data
  const {
    orders,
    loading: ordersListLoading,
    refetch: refetchOrders,
  } = useOrders(dateString);
  const {
    summary: ordersSummary,
    loading: ordersLoading,
    refetch: refetchOrdersSummary,
  } = useOrdersSummary(dateString);
  const ordersSortedByTicket = ordersByTicket(orders, "desc");

  // Returns data
  const {
    returns,
    loading: returnsListLoading,
    refetch: refetchReturns,
  } = useReturns(dateString);
  const {
    summary: returnsSummary,
    loading: returnsLoading,
    refetch: refetchReturnsSummary,
  } = useReturnsSummary(dateString);
  const returnsSortedByTicket = [...returns].sort((a, b) => {
    if (!a.ticket || !b.ticket) return 0;
    return b.ticket.localeCompare(a.ticket);
  });

  // Refetch all data
  const refetchAllData = () => {
    refetchOrders();
    refetchOrdersSummary();
    refetchReturns();
    refetchReturnsSummary();
  };

  // Maneja el cambio de fecha local
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSelectedDateLocal(value);
  };

  // Handle return button click
  const handleReturnClick = (order: ProcessedOrder) => {
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
        // Refresh all data after successful return
        refetchAllData();
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

  const hasNoData =
    orders.length === 0 &&
    returns.length === 0 &&
    !ordersListLoading &&
    !returnsListLoading;

  return (
    <Container maxWidth="xl" className={classes["main-container"]}>
      <Box
        mb={2}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <div style={{ flexGrow: 1 }}></div>
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

        <FormControlLabel
          control={
            <Switch
              checked={isDetailedView}
              onChange={(e) => setIsDetailedView(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {isDetailedView ? "Vista Detallada" : "Vista Simple"}
            </Typography>
          }
          labelPlacement="top"
        />
      </Box>

      {hasNoData ? (
        <Typography variant="h5" component="h1" className={classes.header}>
          No hay ventas ni devoluciones en el día
        </Typography>
      ) : (
        <>
          {/* Summary Cards Row */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              width: "100%",
              maxWidth: isDetailedView ? "80%" : "40%",
              justifyContent: "center",
            }}
          >
            {/* Sales Summary - Always visible */}
            <Box sx={{ minWidth: 0, width: isDetailedView ? "30%" : "100%" }}>
              <PaymentSummary summary={ordersSummary} loading={ordersLoading} />
            </Box>

            {/* Returns and Balance - Only in detailed view */}
            {isDetailedView && (
              <>
                <Box sx={{ minWidth: 0, width: "30%" }}>
                  <ReturnsSummaryCard
                    summary={returnsSummary}
                    loading={returnsLoading}
                  />
                </Box>
                <Box sx={{ minWidth: 0, width: "30%" }}>
                  <SalesDifferenceCard
                    ordersSummary={ordersSummary}
                    returnsSummary={returnsSummary}
                    loading={ordersLoading || returnsLoading}
                  />
                </Box>
              </>
            )}
          </Box>

          {/* Ventas Section */}
          {isDetailedView ? (
            <Accordion
              expanded={salesExpanded}
              onChange={() => setSalesExpanded(!salesExpanded)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ backgroundColor: "#e3f2fd" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Ventas ({orders.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box className={classes["orders-container"]}>
                  {ordersListLoading ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", p: 3 }}
                    >
                      <CircularProgress size={32} />
                    </Box>
                  ) : ordersSortedByTicket.length === 0 ? (
                    <Typography
                      variant="body1"
                      sx={{ p: 2, color: "text.secondary" }}
                    >
                      No hay ventas en esta fecha
                    </Typography>
                  ) : (
                    ordersSortedByTicket.map((order) => (
                      <OrderItem
                        key={order.id}
                        order={order}
                        onReturnClick={handleReturnClick}
                      />
                    ))
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ) : (
            <Box className={classes["orders-container"]} sx={{ mb: 2 }}>
              {ordersListLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : ordersSortedByTicket.length === 0 ? (
                <Typography
                  variant="body1"
                  sx={{ p: 2, color: "text.secondary" }}
                >
                  No hay ventas en esta fecha
                </Typography>
              ) : (
                ordersSortedByTicket.map((order) => (
                  <OrderItem
                    key={order.id}
                    order={order}
                    onReturnClick={handleReturnClick}
                  />
                ))
              )}
            </Box>
          )}

          {/* Devoluciones Section - Only in detailed view */}
          {isDetailedView && (
            <Accordion
              expanded={returnsExpanded}
              onChange={() => setReturnsExpanded(!returnsExpanded)}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ backgroundColor: "#fff3e0" }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#e65100" }}
                >
                  Devoluciones ({returns.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box className={classes["orders-container"]}>
                  {returnsListLoading ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", p: 3 }}
                    >
                      <CircularProgress size={32} sx={{ color: "#e65100" }} />
                    </Box>
                  ) : returnsSortedByTicket.length === 0 ? (
                    <Typography
                      variant="body1"
                      sx={{ p: 2, color: "text.secondary" }}
                    >
                      No hay devoluciones en esta fecha
                    </Typography>
                  ) : (
                    returnsSortedByTicket.map((returnItem) => (
                      <ReturnItem key={returnItem.id} returnItem={returnItem} />
                    ))
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

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
