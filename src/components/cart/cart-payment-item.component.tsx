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
		openSnackBarDeletePayment(payment.id.toString());
	};

	return (
		<TableRow key={payment.id}>
				<TableCell>{formatCurrency(payment.amount)}</TableCell>
				<TableCell>{mapPaymentMethod(payment.payment_method, true)}</TableCell>
				<TableCell>
						<IconButton onClick={() => deletePayment(payment.id)}>
								<DeleteIcon style={{ fontSize: '20px' }} />
						</IconButton>
				</TableCell>
		</TableRow>
	);
};