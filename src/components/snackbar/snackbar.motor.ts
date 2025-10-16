import { enqueueSnackbar } from "notistack";
import { formatCurrency } from "../../functions/generalFunctions";

export const openSnackBarProductAdded = (name: string, price: number) => {
  enqueueSnackbar(`${name} agregado! (${price.toFixed(2)})`, {
    variant: "success",
    style: { opacity: "90%" },
    autoHideDuration: 3000,
  });
};

export const openSnackBarOrderRegistered = (id: string) => {
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
};

export const openSnackBarSplitPaymentRegistered = (
  splitAmount: number,
  paymentMethod: string
) => {
  enqueueSnackbar(
    `Pago de ${formatCurrency(splitAmount)} con ${paymentMethod} registrado!`,
    {
      variant: "success",
      style: { opacity: "90%" },
      autoHideDuration: 3000,
    }
  );
};

export const openSnackBarDeletePayment = () => {
  enqueueSnackbar(`Pago eliminado!`, {
    variant: "success",
    style: { opacity: "90%" },
    autoHideDuration: 3000,
  });
};

export const openSnackBarComboAdded = (message: string) => {
  enqueueSnackbar(`${message}`, {
    variant: "success",
    style: { opacity: "90%" },
    autoHideDuration: 3000,
  });
};

export const openSnackBarComboRemoved = (name: string, price: number) => {
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

export const openSnackBarCartCleared = () => {
  enqueueSnackbar("El carrito se limpió correctamente.", {
    variant: "success",
    style: { opacity: "90%" },
    autoHideDuration: 3000,
  });
};

export const openSnackBarInventorySuccess = (productsCount: number) => {
  enqueueSnackbar(
    `Entradas registradas exitosamente. ${productsCount} productos actualizados.`,
    {
      variant: "success",
      style: { opacity: "90%" },
      autoHideDuration: 4000,
    }
  );
};

export const openSnackBarInventoryError = (message: string) => {
  enqueueSnackbar(`Error al registrar entradas: ${message}`, {
    variant: "error",
    style: { opacity: "90%" },
    autoHideDuration: 5000,
  });
};

export const openSnackBarInventoryValidation = (message: string) => {
  enqueueSnackbar(message, {
    variant: "warning",
    style: { opacity: "90%" },
    autoHideDuration: 4000,
  });
};

export const openSnackBarValidationError = (message: string) => {
  enqueueSnackbar(message, {
    variant: "error",
    style: { opacity: "90%" },
    autoHideDuration: 4000,
  });
};

export const openSnackBarProductError = (message: string) => {
  enqueueSnackbar(message, {
    variant: "error",
    style: { opacity: "90%" },
    autoHideDuration: 4000,
  });
};

export const openSnackBarDeleteError = () => {
  enqueueSnackbar("Hubo un error al eliminar el producto.", {
    variant: "error",
    style: { opacity: "90%" },
    autoHideDuration: 4000,
  });
};

export const openSnackBarSaveChangesFirst = () => {
  enqueueSnackbar("Debe guardar los cambios antes de gestionar variantes.", {
    variant: "warning",
    style: { opacity: "90%" },
    autoHideDuration: 4000,
  });
};
