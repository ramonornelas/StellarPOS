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

  if (!summary || summary.refund_methods.length === 0) {
    return null;
  }

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
        {summary.refund_methods.map((method) => (
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
              {method.transaction_count === 1 ? "devolución" : "devoluciones"})
            </Typography>
          </Box>
        ))}
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
          Total devoluciones:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#e65100" }}>
          {formatCurrency(summary.total_amount)} ({summary.total_transactions}{" "}
          {summary.total_transactions === 1 ? "devolución" : "devoluciones"})
        </Typography>
      </Box>
    </Paper>
  );
};
