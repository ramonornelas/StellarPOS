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
	enqueueSnackbar(`Orden ${id} registrada exitosamente!`, {
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

export const openSnackBarDeletePayment = () => {
	enqueueSnackbar(`Pago eliminado!`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
}

export const openSnackBarComboAdded = (message: string) => {
	enqueueSnackbar(`${message}`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
};

export const openSnackBarComboRemoved = (name: string, price:number) => {
	enqueueSnackbar(`Combo ${name} eliminado! (${price.toFixed(2)})`, {
		variant: "success",
		style: { opacity: "90%" },
    autoHideDuration: 3000,
	});
};

export const openSnackBarCashRegisterOpened = () => {
    enqueueSnackbar("¡Caja abierta correctamente! Ya puedes comenzar a operar.", {
        variant: "success",
        style: { opacity: "90%" },
        autoHideDuration: 5000,
    });
};