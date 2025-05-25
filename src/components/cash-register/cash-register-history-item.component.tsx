import { Accordion, AccordionSummary, AccordionDetails, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatCurrency } from "../../functions/generalFunctions";

interface CashRegisterHistoryItemProps {
  item: any;
}

export const CashRegisterHistoryItem: React.FC<CashRegisterHistoryItemProps> = ({ item }) => {
  const openedAt = item.opened_at ? new Date(item.opened_at) : null;
  const closedAt = item.closed_at ? new Date(item.closed_at) : null;

  const statusLabel = item.status === "closed" ? "Cerrado" : "Abierto";

  // Determinar color de fondo según la diferencia
  let differenceColor = "transparent";
  if (
    item.difference_amount !== undefined &&
    item.difference_amount !== null &&
    Number(item.difference_amount) === 0
  ) {
    differenceColor = "#E8F5E9"; // verde mucho más claro
  } else if (item.difference_amount > 0) {
    differenceColor = "#FFFDE7"; // amarillo mucho más claro
  } else if (item.difference_amount < 0) {
    differenceColor = "#FCE4EC"; // rosa mucho más claro
  }

  return (
    <Accordion sx={{ width: "100%", boxSizing: "border-box" }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: differenceColor, // <-- Aplica el color aquí
          borderRadius: 1,
          transition: "background-color 0.3s",
        }}
      >
        <Box sx={{ width: "100%", overflowX: "auto", boxSizing: "border-box" }}>
          {/* Header row */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
              mb: 1,
              flexWrap: "wrap",
              boxSizing: "border-box",
            }}
          >
            <Typography variant="caption" sx={{ minWidth: 100 }}>Fecha</Typography>
            <Typography variant="caption" sx={{ minWidth: 80 }}>Estatus</Typography>
            <Typography variant="caption" sx={{ minWidth: 120 }}>Hora apertura</Typography>
            <Typography variant="caption" sx={{ minWidth: 120 }}>Hora cierre</Typography>
            <Typography variant="caption" sx={{ minWidth: 120 }}>Cierre</Typography>
            <Typography variant="caption" sx={{ minWidth: 120 }}>Esperado</Typography>
            <Typography variant="caption" sx={{ minWidth: 120 }}>Diferencia</Typography>
          </Box>
          {/* Data row */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
              flexWrap: "wrap",
              boxSizing: "border-box",
              backgroundColor: differenceColor,
              borderRadius: 1,
            }}
          >
            <Typography variant="body1" sx={{ minWidth: 100 }}>{item.date ?? "-"}</Typography>
            <Typography variant="body2" sx={{ minWidth: 80 }}>{statusLabel}</Typography>
            <Typography variant="body2" sx={{ minWidth: 120 }}>{openedAt ? openedAt.toLocaleTimeString() : "-"}</Typography>
            <Typography variant="body2" sx={{ minWidth: 120 }}>{closedAt ? closedAt.toLocaleTimeString() : "-"}</Typography>
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {item.closing_amount !== undefined && item.closing_amount !== null ? formatCurrency(item.closing_amount, "es-MX", "MXN") : "-"}
            </Typography>
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {item.expected_amount !== undefined && item.expected_amount !== null ? formatCurrency(item.expected_amount, "es-MX", "MXN") : "-"}
            </Typography>
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              {item.difference_amount !== undefined && item.difference_amount !== null ? formatCurrency(item.difference_amount, "es-MX", "MXN") : "-"}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ width: "100%", boxSizing: "border-box" }}>
        <Box>
          <Typography variant="body2">
            <strong>Monto de apertura:</strong> {item.opening_amount !== undefined && item.opening_amount !== null ? formatCurrency(item.opening_amount, "es-MX", "MXN") : "-"}
          </Typography>
          <Typography variant="body2">
            <strong>Ventas en efectivo:</strong> {item.cash_sales !== undefined && item.cash_sales !== null ? formatCurrency(item.cash_sales, "es-MX", "MXN") : "-"}
          </Typography>
          <Typography variant="body2">
            <strong>Monto esperado:</strong> {item.expected_amount !== undefined && item.expected_amount !== null ? formatCurrency(item.expected_amount, "es-MX", "MXN") : "-"}
          </Typography>
          <Typography variant="body2">
            <strong>Monto de cierre:</strong> {item.closing_amount !== undefined && item.closing_amount !== null ? formatCurrency(item.closing_amount, "es-MX", "MXN") : "-"}
          </Typography>
          <Typography variant="body2">
            <strong>Diferencia:</strong> {item.difference_amount !== undefined && item.difference_amount !== null ? formatCurrency(item.difference_amount, "es-MX", "MXN") : "-"}
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};