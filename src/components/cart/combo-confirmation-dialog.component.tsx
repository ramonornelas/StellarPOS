import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { Product } from "../products/products.model";
import { formatCurrency } from "../../functions/generalFunctions";

interface ComboConfirmationDialogProps {
  open: boolean;
  combos: Product[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ComboConfirmationDialog: React.FC<
  ComboConfirmationDialogProps
> = ({ open, combos, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Aplicar combos</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          ¿Quieres aplicar los siguientes combos?
        </Typography>
        <Box sx={{ pl: 1 }}>
          {combos.map((combo, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
              • {combo.name} por {formatCurrency(combo.price)}
            </Typography>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancelar
        </Button>
        <Button onClick={onConfirm} variant="contained" color="success">
          Aplicar combos
        </Button>
      </DialogActions>
    </Dialog>
  );
};
