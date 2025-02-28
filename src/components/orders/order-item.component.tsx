import { Accordion, AccordionSummary, Box, Container, Typography } from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Order } from "./order.model";
import { OrderDetails } from "./order-details.component";
import classes from "./css/order-item.module.css";
import { formatDate } from '../../functions/generalFunctions';
import { mapPaymentMethod, formatCurrency } from '../../functions/generalFunctions';

interface OrderProps {
	order : Order;
}

export const OrderItem: React.FC<OrderProps> = (props) => {
	const { order } = props;

	return (
			<Accordion key={order.id} className={classes["order-accordion"]}>
					<AccordionSummary
							expandIcon={<ExpandMoreIcon />}
							aria-controls={`${order.id}-content`}
							id={`${order.id}-header`}
					>
							<Container
								className={classes["accordion-container"]}
							>
									<Box>
											<Typography variant="body1" component="p">
													<strong>{order.ticket}</strong>
											</Typography>
											<Typography variant="body2" component="p" className={classes.date}>
													{formatDate(order.date)}
											</Typography>
											<Typography variant="body2" component="p">
													Forma de pago: {mapPaymentMethod(order.payment_method)}
											</Typography>
									</Box>
									<Box className={classes["accordion-badge-container"]}>
											<Typography variant="body2" component="p">
													Total: {formatCurrency(order.total)}
											</Typography>
									</Box>
							</Container>
					</AccordionSummary>
					<OrderDetails order={order} />
			</Accordion>
	);
};