import {
  Accordion,
  AccordionSummary,
  Box,
  Container,
  Typography,
  Button,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import { ProcessedOrder } from "../../types/order";
import { OrderDetails } from "./order-details.component";
import classes from "./css/order-item.module.css";
import { formatDateTime } from "../../functions/generalFunctions";
import {
  mapPaymentMethod,
  formatCurrency,
} from "../../functions/generalFunctions";

interface OrderProps {
  order: ProcessedOrder;
  onReturnClick?: (order: ProcessedOrder) => void;
}

export const OrderItem: React.FC<OrderProps> = (props) => {
  const { order, onReturnClick } = props;

  // Helper function to get the best available datetime
  const getOrderDateTime = () => {
    if (order.created_datetime) {
      return formatDateTime(order.created_datetime);
    }
  };

  // Determine return status for display
  const getReturnStatusInfo = () => {
    const status = order.return_status;
    if (status === "total") {
      return {
        label: "Devuelto totalmente",
        color: "error" as const,
        activeButton: false,
      };
    } else if (status === "partial") {
      return {
        label: "Devuelto parcialmente",
        color: "warning" as const,
        activeButton: true,
      };
    }
    return {
      label: null,
      color: "default" as const,
      activeButton: true,
    };
  };

  const returnStatusInfo = getReturnStatusInfo();

  return (
    <Accordion key={order.id} className={classes["order-accordion"]}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${order.id}-content`}
        id={`${order.id}-header`}
      >
        <Container className={classes["accordion-container"]}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body1" component="p">
                <strong>{order.ticket}</strong>
              </Typography>
              {returnStatusInfo.label && (
                <Chip
                  label={returnStatusInfo.label}
                  color={returnStatusInfo.color}
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 22 }}
                />
              )}
            </Box>
            <Typography variant="body2" component="p" className={classes.date}>
              📅 {getOrderDateTime()}
            </Typography>
            <Typography variant="body2" component="p">
              Forma de pago: {mapPaymentMethod(order.payment_method)}
            </Typography>
          </Box>
          <Box className={classes["accordion-badge-container"]}>
            <Typography variant="body2" component="p">
              Total: {formatCurrency(Number(order.total))}
            </Typography>
            {onReturnClick && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AssignmentReturnIcon />}
                disabled={!returnStatusInfo.activeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onReturnClick(order);
                }}
                sx={{ mt: 1, fontSize: "0.75rem" }}
              >
                Devolución
              </Button>
            )}
          </Box>
        </Container>
      </AccordionSummary>
      <OrderDetails order={order} />
    </Accordion>
  );
};
