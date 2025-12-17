import React from "react";
import { Typography, Paper, Box } from "@mui/material";
import { formatCurrency } from "../../functions/generalFunctions";
import { OrderSummary, ReturnSummary } from "../../types/order";

interface SalesDifferenceCardProps {
  ordersSummary: OrderSummary | null;
  returnsSummary: ReturnSummary | null;
  loading: boolean;
}

export const SalesDifferenceCard: React.FC<SalesDifferenceCardProps> = ({
  ordersSummary,
  returnsSummary,
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

  const paymentMethods = new Set<string>();
  ordersSummary?.payment_methods.forEach((pm) => paymentMethods.add(pm.method));
  returnsSummary?.refund_methods.forEach((rm) => paymentMethods.add(rm.method));

  const netSalesByMethod: {
    method: string;
    method_display: string;
    amount: number;
  }[] = [];

  paymentMethods.forEach((method) => {
    const salesMethod = ordersSummary?.payment_methods.find(
      (pm) => pm.method === method
    );
    const returnMethod = returnsSummary?.refund_methods.find(
      (rm) => rm.method === method
    );

    const salesAmount = salesMethod?.total_amount || 0;
    const returnAmount = returnMethod?.total_amount || 0;
    const netAmount = salesAmount - returnAmount;

    const displayName =
      salesMethod?.method_display || returnMethod?.method_display || method;

    if (netAmount !== 0) {
      netSalesByMethod.push({
        method,
        method_display: displayName,
        amount: netAmount,
      });
    }
  });

  const totalSales = ordersSummary?.total_amount || 0;
  const totalReturns = returnsSummary?.total_amount || 0;
  const totalDifference = totalSales - totalReturns;
  const isPositive = totalDifference >= 0;

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

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {netSalesByMethod.map((item) => (
          <Box
            key={item.method}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.9rem",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              • {item.method_display}:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 1,
          pt: 1,
          borderTop: "1px solid",
          borderColor: isPositive ? "#a5d6a7" : "#ef9a9a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isPositive ? "#2e7d32" : "#c62828",
          }}
        >
          Total:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: isPositive ? "#2e7d32" : "#c62828",
          }}
        >
          {formatCurrency(totalDifference)}
        </Typography>
      </Box>
    </Paper>
  );
};
