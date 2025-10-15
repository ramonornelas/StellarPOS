import { useState } from "react";
import { Product } from "../products/products.model";

// Hook personalizado para manejar la confirmación de combos
export const useComboConfirmation = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [combos, setCombos] = useState<Product[]>([]);
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirmComboDialog = (combosToConfirm: Product[]): Promise<boolean> => {
    return new Promise((resolve) => {
      setCombos(combosToConfirm);
      setDialogOpen(true);
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    setDialogOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  };

  return {
    confirmComboDialog,
    handleConfirm,
    handleCancel,
    dialogOpen,
    combos,
  };
};
