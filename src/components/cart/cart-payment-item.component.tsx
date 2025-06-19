import React from "react";
import {
	IconButton,
	TableCell,
	TableRow,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { appContext } from "../../appContext";
import { openSnackBarDeletePayment } from "../snackbar/snackbar.motor";
import { formatCurrency, mapPaymentMethod } from "../../functions/generalFunctions";

interface PaymentItemProps {
	payment: {
		id: number;
		amount: number;
		payment_method: string;
	};
}

export const PaymentItem: React.FC<PaymentItemProps> = ({ payment }) => {
	const { splitPayments, setSplitPayments } = React.useContext(appContext).paymentCTX;

	const deletePayment = (id: number) => {
		const updatedPayments = splitPayments.filter(p => p.id !== id);
		setSplitPayments(updatedPayments);
		openSnackBarDeletePayment();
	};

	const ischange = payment.amount < 0; // Check if the movement is negative
	const formattedAmount = ischange
		? `(${formatCurrency(Math.abs(payment.amount))})` // Show in parentheses and as positive
		: formatCurrency(payment.amount);

	const description = ischange
		? `Cambio ${mapPaymentMethod(payment.payment_method, true)}` // Add "Cambio" at the beginning if negative
		: mapPaymentMethod(payment.payment_method, true);

	return (
		<TableRow key={payment.id}>
				<TableCell>{formattedAmount}</TableCell>
				<TableCell>{description}</TableCell>
				<TableCell>
						<IconButton onClick={() => deletePayment(payment.id)}>
								<DeleteIcon style={{ fontSize: '20px' }} />
						</IconButton>
				</TableCell>
		</TableRow>
	);
};