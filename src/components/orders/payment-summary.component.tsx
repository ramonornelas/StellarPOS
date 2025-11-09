import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { OrderSummary } from "./order.model";
import { formatCurrency } from "../../functions/generalFunctions";

interface PaymentSummaryProps {
  summary: OrderSummary | null;
  loading: boolean;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Cargando resumen...
        </Typography>
      </Paper>
    );
  }

  if (!summary || summary.payment_methods.length === 0) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          fontSize: "1rem",
          mb: 1,
          color: "primary.main",
        }}
      >
        💰 Resumen por forma de pago:
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {summary.payment_methods.map((method) => (
          <Box
            key={method.method}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.9rem",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              • {method.method_display}:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(method.total_amount)} ({method.transaction_count}{" "}
              {method.transaction_count === 1 ? "venta" : "ventas"})
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 1,
          pt: 1,
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Total:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatCurrency(summary.total_amount)} ({summary.total_transactions}{" "}
          {summary.total_transactions === 1 ? "venta" : "ventas"})
        </Typography>
      </Box>
    </Paper>
  );
};
