import {
  Accordion,
  AccordionSummary,
  Box,
  Container,
  Typography,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import { Order } from "./order.model";
import { OrderDetails } from "./order-details.component";
import classes from "./css/order-item.module.css";
import { formatDateTime } from "../../functions/generalFunctions";
import {
  mapPaymentMethod,
  formatCurrency,
} from "../../functions/generalFunctions";

interface OrderProps {
  order: Order;
  onReturnClick?: (order: Order) => void;
}

export const OrderItem: React.FC<OrderProps> = (props) => {
  const { order, onReturnClick } = props;

  // Helper function to get the best available datetime
  const getOrderDateTime = () => {
    if (order.created_datetime) {
      return formatDateTime(order.created_datetime);
    } else if (order.datetime) {
      return formatDateTime(order.datetime);
    } else {
      return formatDateTime(order.date);
    }
  };

  return (
    <Accordion key={order.id} className={classes["order-accordion"]}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${order.id}-content`}
        id={`${order.id}-header`}
      >
        <Container className={classes["accordion-container"]}>
          <Box>
            <Typography variant="body1" component="p">
              <strong>{order.ticket}</strong>
            </Typography>
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
