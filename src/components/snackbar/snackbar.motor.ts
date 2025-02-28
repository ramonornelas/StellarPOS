import { enqueueSnackbar } from "notistack";
import { formatCurrency } from "../../functions/generalFunctions";

export const openSnackBarProductAdded = (name: string, price:number) => {
	enqueueSnackbar(`${name} agregado! (${price.toFixed(2)})`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
};

export const openSnackBarOrderRegistered = (id:string) => {
	enqueueSnackbar(`Comanda ${id} registrada exitosamente!`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
};

export const openSnackBarDeleteProduct = (name: string) => {
	enqueueSnackbar(`${name} eliminado!`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
}

export const openSnackBarSplitPaymentRegistered = (splitAmount: number, paymentMethod: string) => {
	enqueueSnackbar(`Pago de ${formatCurrency(splitAmount)} con ${paymentMethod} registrado!`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
};

export const openSnackBarDeletePayment = (name: string) => {
	enqueueSnackbar(`${name} eliminado!`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
}