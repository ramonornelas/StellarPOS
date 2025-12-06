import React from "react";
import { Typography, Paper } from "@mui/material";
import { formatCurrency } from "../../functions/generalFunctions";

interface SalesDifferenceCardProps {
  totalSales: number;
  totalReturns: number;
  loading: boolean;
}

export const SalesDifferenceCard: React.FC<SalesDifferenceCardProps> = ({
  totalSales,
  totalReturns,
  loading,
}) => {
  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Calculando...
        </Typography>
      </Paper>
    );
  }

  const difference = totalSales - totalReturns;
  const isPositive = difference >= 0;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        backgroundColor: isPositive ? "#e8f5e9" : "#ffebee",
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          fontSize: "1rem",
          mb: 1,
          color: isPositive ? "#2e7d32" : "#c62828",
        }}
      >
        📊 Ventas netas:
      </Typography>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: isPositive ? "#2e7d32" : "#c62828",
          textAlign: "center",
        }}
      >
        {formatCurrency(difference)}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          textAlign: "center",
          color: "text.secondary",
          mt: 0.5,
        }}
      >
        Ventas ({formatCurrency(totalSales)}) - Devoluciones (
        {formatCurrency(totalReturns)})
      </Typography>
    </Paper>
  );
};
