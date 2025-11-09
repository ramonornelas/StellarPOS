import { AccordionDetails, Box, Divider, Typography } from "@mui/material";
import { Order, ProductOrder } from "./order.model";
import { groupOrderProducts } from "./order.motor";
import classes from "./css/order-details.module.css";
import {
  mapPaymentMethod,
  formatCurrency,
} from "../../functions/generalFunctions";

interface OrderDetailsProps {
  order: Order;
}

export const OrderDetails: React.FC<OrderDetailsProps> = (props) => {
  const { order } = props;

  // Cast the products to the correct type since the backend sends OrderProductData
  const productsGrouped = groupOrderProducts(
    order.products as unknown as ProductOrder[]
  );
  const splitPayments = order.splitPayments;

  return (
    <AccordionDetails sx={{ px: 4 }}>
      {productsGrouped.map((product) => (
        <Box
          key={`${product.id}-${product.product_variant_id}`}
          className={classes["accordion-details-container"]}
        >
          <Typography variant="body1" component="p">
            {product.qty} x {product.desc}
          </Typography>
          <Typography variant="body1" component="p">
            {formatCurrency(product.unit)}
          </Typography>
        </Box>
      ))}
      {order.notes && (
        <>
          <Box m={2} />
          <Typography variant="h6" component="p">
            Notas: {order.notes}
          </Typography>
        </>
      )}
      <Divider sx={{ m: 1 }} />
      <Typography variant="body1" component="p" sx={{ textAlign: "right" }}>
        Subtotal: {formatCurrency(Number(order.subtotal))}
      </Typography>
      {Number(order.discount) > 0 && (
        <Typography variant="body1" component="p" sx={{ textAlign: "right" }}>
          Descuento: - {formatCurrency(Number(order.discount))}
        </Typography>
      )}
      <Typography variant="h5" component="p" sx={{ textAlign: "right" }}>
        <strong>Total: {formatCurrency(Number(order.total))}</strong>
      </Typography>
      {(splitPayments?.length ?? 0) > 0 && (
        <>
          <Divider sx={{ m: 1 }} />
          <Typography
            variant="subtitle2"
            sx={{
              textAlign: "right",
              color: "primary.main",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Pagos
          </Typography>
          <Box m={0.5} />
        </>
      )}
      {splitPayments &&
        (() => {
          const positivePayments = splitPayments.filter(
            (payment) => Number(payment.amount) >= 0
          );
          const negativePayments = splitPayments.filter(
            (payment) => Number(payment.amount) < 0
          );
          const sortedPayments = [...positivePayments, ...negativePayments];

          return sortedPayments.map((payment) => {
            const isNegative = Number(payment.amount) < 0;
            const paymentDescription = isNegative
              ? `Cambio ${mapPaymentMethod(payment.payment_method)}`
              : mapPaymentMethod(payment.payment_method);
            const paymentAmount = isNegative
              ? `(${formatCurrency(Math.abs(Number(payment.amount)))})`
              : formatCurrency(Number(payment.amount));

            return (
              <Box
                key={payment.id}
                className={classes["accordion-split-payments-container"]}
              >
                <Typography
                  variant="body1"
                  component="p"
                  sx={{ textAlign: "right", fontSize: "0.9rem" }}
                >
                  {paymentDescription}:
                </Typography>
                <Box m={1} />
                <Typography
                  variant="body1"
                  component="p"
                  sx={{ fontSize: "0.9rem" }}
                >
                  {paymentAmount}
                </Typography>
              </Box>
            );
          });
        })()}
      {Number(order.tip) > 0 && (
        <>
          <Divider sx={{ m: 1 }} />
          <Typography
            variant="body1"
            component="p"
            sx={{ textAlign: "right", fontSize: "0.9rem" }}
          >
            Propina: (+{formatCurrency(Number(order.tip))})
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ textAlign: "right", fontSize: "1rem" }}
          >
            Total con propina: ({formatCurrency(Number(order.total_with_tip))})
          </Typography>
        </>
      )}
      {order.received_amount !== undefined && (
        <>
          <Divider sx={{ m: 1 }} />
          <Typography
            variant="body1"
            component="p"
            sx={{ textAlign: "right", fontSize: "0.9rem" }}
          >
            Recibido: {formatCurrency(Number(order.received_amount))}
          </Typography>
        </>
      )}
      {order.change !== undefined && (
        <Typography
          variant="body1"
          component="p"
          sx={{ textAlign: "right", fontSize: "0.9rem" }}
        >
          Cambio: {formatCurrency(Number(order.change))}
        </Typography>
      )}
    </AccordionDetails>
  );
};
