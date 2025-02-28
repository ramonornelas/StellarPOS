import { AccordionDetails, Box, Divider, Typography } from "@mui/material";
import { Order } from "./order.model";
import { groupProducts } from "../cart/cart.motor";
import classes from "./css/order-details.module.css";
import { mapPaymentMethod, formatCurrency } from "../../functions/generalFunctions";

interface OrderDetailsProps {
	order: Order;
}

export const OrderDetails: React.FC<OrderDetailsProps> = (props) => {
	const { order } = props;

	const productsGrouped = groupProducts(order.products);
	const splitPayments = order.splitPayments;

	return (
		<AccordionDetails sx={{ px: 4 }}>
			{productsGrouped.map((product) => (
				<Box key={`${product.id}-${product.product_variant_id}`}
					className={classes["accordion-details-container"]}
				>
					<Typography variant="body1" component="p">
						{product.qty} x {product.desc}
					</Typography>
					<Typography variant="body1" component="p">
						({formatCurrency(product.unit)})
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
				Subtotal: {formatCurrency(order.subtotal)}
			</Typography>
			{order.discount > 0 && (
				<Typography variant="body1" component="p" sx={{ textAlign: "right" }}>
					Descuento: - {formatCurrency(order.discount)}
				</Typography>
			)}
			<Typography variant="h5" component="p" sx={{ textAlign: "right" }}>
				<strong>Total: {formatCurrency(order.total)}</strong>
			</Typography>
			{(splitPayments?.length ?? 0) > 0 && (
				<>
					<Divider sx={{ m: 1 }} />
				</>
			)}
			{splitPayments && splitPayments.map((payment) => (
				<>
					<Box key={payment.id} className={classes["accordion-split-payments-container"]}>
						<Typography variant="body1" component="p">
							{mapPaymentMethod(payment.payment_method)}:
						</Typography>
						<Box m={1} />
						<Typography variant="body1" component="p">
							{formatCurrency(payment.amount)}
						</Typography>
					</Box>
				</>
			))}
			{order.tip > 0 && (
				<>
					<Divider sx={{ m: 1 }} />
					<Typography variant="body1" component="p" sx={{ textAlign: "right" }}>
						Propina: (+{formatCurrency(order.tip)})
					</Typography>
					<Typography variant="h6" component="p" sx={{ textAlign: "right" }}>
						Total con propina: ({formatCurrency(order.total_with_tip)})
					</Typography>
				</>
			)}
		</AccordionDetails>
	);
}