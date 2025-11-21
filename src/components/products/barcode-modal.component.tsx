import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";

interface BarcodeModalProps {
  open: boolean;
  onClose: () => void;
  item: { name: string; barcode?: string } | null;
  itemType?: "producto" | "variante";
  onConfirm: () => void;
  isGenerating: boolean;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  open,
  onClose,
  item,
  itemType = "producto",
  onConfirm,
  isGenerating,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Regenerar Código de Barras</DialogTitle>
      <DialogContent>
        <Typography>
          {itemType === "producto" ? "El producto" : "La variante"} "
          {item?.name}" ya tiene un código de barras asignado:{" "}
          <strong>{item?.barcode}</strong>. Generar uno nuevo podría causar
          inconsistencias en el inventario actual. ¿Deseas continuar?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isGenerating}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={16} /> : null}
        >
          {isGenerating ? "Generando..." : "Continuar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
