import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { OrderSummary } from "../../types/order";
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

  const paymentMethods = summary?.payment_methods || [];
  const totalAmount = summary?.total_amount || 0;
  const totalTransactions = summary?.total_transactions || 0;

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
        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
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
                • {method.method_display} ({method.transaction_count}):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(method.total_amount)}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            No hay ventas
          </Typography>
        )}
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
          Total ({totalTransactions}):
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatCurrency(totalAmount)}
        </Typography>
      </Box>
    </Paper>
  );
};
