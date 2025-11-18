import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  RunDetailsResponse,
  MOVEMENT_TYPE_CONFIG,
} from "./inventoryMovementsTypes";
import {
  formatMovementDateTime,
  formatQuantityChange,
} from "./inventoryMovementsHelpers";

interface InventoryMovementsModalProps {
  open: boolean;
  onClose: () => void;
  runDetails: RunDetailsResponse["data"] | null;
  loading: boolean;
  error?: string | null;
}

const getMovementTypeChip = (movementType: string, model: string) => {
  const config = MOVEMENT_TYPE_CONFIG[movementType];
  if (!config) return null;

  const displayConfig = {
    label: `${config.label}`,
    color: config.color,
  };

  if (model === "detailed") {
    return (
      <Chip
        label={`${config.icon} ${displayConfig.label}`}
        style={{ backgroundColor: config.color, color: "#fff" }}
        size="small"
      />
    );
  } else {
    return (
      <Chip
        label={displayConfig.label}
        style={{ backgroundColor: displayConfig.color, color: "#fff" }}
        size="small"
      />
    );
  }
};

export const InventoryMovementsModal: React.FC<
  InventoryMovementsModalProps
> = ({ open, onClose, runDetails, loading, error }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Detalles del Run de Movimientos</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : runDetails ? (
          <Box>
            {/* Run Info */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información del Run
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      ID: {runDetails.run_info.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fecha:{" "}
                      {formatMovementDateTime(
                        runDetails.run_info.created_datetime
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Usuario: {runDetails.run_info.user_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Tipo:{" "}
                      {getMovementTypeChip(
                        runDetails.run_info.movement_type,
                        ""
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Items: {runDetails.run_info.items_count}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Divider sx={{ my: 2 }} />

            {/* Movements in run */}
            <Typography variant="h6" gutterBottom>
              Movimientos ({runDetails.movements.length})
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Anterior</TableCell>
                    <TableCell align="right">Nuevo</TableCell>
                    <TableCell align="center">Reconteo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {runDetails.movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {movement.product_name}
                          {movement.variant_name &&
                            ` - ${movement.variant_name}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getMovementTypeChip(
                          movement.movement_type,
                          "detailed"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              movement.quantity > 0
                                ? "success.main"
                                : "error.main",
                            fontWeight: 600,
                          }}
                        >
                          {formatQuantityChange(movement.quantity)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {movement.previous_quantity}
                      </TableCell>
                      <TableCell align="right">
                        {movement.new_quantity}
                      </TableCell>
                      <TableCell align="center">
                        {movement.movement_type === "count" ? (
                          movement.required_recount !== undefined ? (
                            movement.required_recount ? (
                              <Chip label="Sí" color="warning" size="small" />
                            ) : (
                              <Chip label="No" color="success" size="small" />
                            )
                          ) : (
                            <Chip
                              label="No aplica"
                              color="default"
                              size="small"
                            />
                          )
                        ) : (
                          <Chip
                            label="No aplica"
                            color="default"
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Typography>Error cargando detalles del run</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryMovementsModal;
