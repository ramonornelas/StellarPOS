import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { ReturnSummary } from "../../types/order";
import { formatCurrency } from "../../functions/generalFunctions";

interface ReturnsSummaryProps {
  summary: ReturnSummary | null;
  loading: boolean;
}

export const ReturnsSummaryCard: React.FC<ReturnsSummaryProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Cargando resumen de devoluciones...
        </Typography>
      </Paper>
    );
  }

  const refundMethods = summary?.refund_methods || [];
  const totalAmount = summary?.total_amount || 0;
  const totalTransactions = summary?.total_transactions || 0;

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, mb: 2, borderRadius: 2, backgroundColor: "#fff3e0" }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          fontSize: "1rem",
          mb: 1,
          color: "#e65100",
        }}
      >
        ↩️ Resumen de devoluciones:
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {refundMethods.length > 0 ? (
          refundMethods.map((method) => (
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
            No hay devoluciones
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          mt: 1,
          pt: 1,
          borderTop: "1px solid #ffcc80",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#e65100" }}>
          Total devoluciones ({totalTransactions}):
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#e65100" }}>
          {formatCurrency(totalAmount)}
        </Typography>
      </Box>
    </Paper>
  );
};
