import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Container,
  Typography,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ProcessedReturn, ProcessedReturnProductItem } from "../../types/order";
import classes from "./css/order-item.module.css";
import { formatDateTime } from "../../functions/generalFunctions";
import {
  mapPaymentMethod,
  formatCurrency,
} from "../../functions/generalFunctions";

interface ReturnItemProps {
  returnItem: ProcessedReturn;
}

export const ReturnItem: React.FC<ReturnItemProps> = ({ returnItem }) => {
  // Helper function to get the best available datetime
  const getReturnDateTime = () => {
    if (returnItem.created_datetime) {
      return formatDateTime(returnItem.created_datetime);
    } else if (returnItem.date) {
      return formatDateTime(returnItem.date);
    }
    return "";
  };

  return (
    <Accordion className={classes["order-accordion"]}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${returnItem.id}-content`}
        id={`${returnItem.id}-header`}
      >
        <Container className={classes["accordion-container"]}>
          <Box>
            <Typography variant="body1" component="p">
              <strong>↩️ {returnItem.ticket}</strong>
            </Typography>
            <Typography variant="body2" component="p" className={classes.date}>
              📅 {getReturnDateTime()}
            </Typography>
            <Typography variant="body2" component="p">
              Reembolso: {mapPaymentMethod(returnItem.refund_method)}
            </Typography>
          </Box>
          <Box className={classes["accordion-badge-container"]}>
            <Typography
              variant="body2"
              component="p"
              sx={{ color: "#e65100", fontWeight: 600 }}
            >
              Total: {formatCurrency(Number(returnItem.refund_amount))}
            </Typography>
          </Box>
        </Container>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 4 }}>
        {returnItem.products &&
          returnItem.products.map(
            (product: ProcessedReturnProductItem, index: number) => (
              <Box
                key={`${product.product_id}-${index}`}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body1" component="p">
                  {product.quantity} x {product.product_name}
                </Typography>
                <Typography variant="body1" component="p">
                  {formatCurrency(Number(product.total))}
                </Typography>
              </Box>
            )
          )}
        <Divider sx={{ m: 1 }} />
        <Typography variant="h6" component="p" sx={{ textAlign: "right" }}>
          <strong>
            Total: {formatCurrency(Number(returnItem.refund_amount))}
          </strong>
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};
