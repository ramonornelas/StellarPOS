import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import InfoIcon from "@mui/icons-material/Info";
import {
  InventoryMovement,
  MovementFilters,
  MOVEMENT_TYPE_CONFIG,
  RunDetailsResponse,
  MovementPagination,
} from "./inventoryMovementsTypes";
import {
  formatMovementDateTime,
  formatQuantityChange,
  getProductDisplayName,
  updateURLWithFilters,
  parseFiltersFromURL,
} from "./inventoryMovementsHelpers";
import {
  fetchInventoryMovements,
  fetchInventoryMovementRunDetails,
} from "../../functions/apiFunctions";
import { Grid } from "@mui/material";
import InventoryMovementsModal from "./InventoryMovementsModal";
import NumberedPagination from "./NumberedPagination";

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper function to format date without timezone conversion (start of day)
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00`;
};

// Helper function to format date for "date_to" to include the entire day
const formatDateToLocalEndOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}T23:59:59`;
};

// Helper function to create a local Date object from YYYY-MM-DD string or YYYY-MM-DD HH:mm:ss string or ISO string
const createLocalDateFromString = (dateString: string): Date => {
  // Extract just the date part if there's a time component
  let datePart = dateString;
  if (dateString.includes(" ")) {
    datePart = dateString.split(" ")[0];
  } else if (dateString.includes("T")) {
    datePart = dateString.split("T")[0];
  }

  const [year, month, day] = datePart
    .split("-")
    .map((num) => parseInt(num, 10));
  // Create date in local timezone (month is 0-indexed in Date constructor)
  return new Date(year, month - 1, day);
};

const InventoryMovements: React.FC = () => {
  // State management
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [pagination, setPagination] = useState<MovementPagination>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    page_size: 50,
    has_next: false,
    has_previous: false,
  });
  const [filters, setFilters] = useState<MovementFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter form state
  const [tempFilters, setTempFilters] = useState<MovementFilters>({});

  // Debounced filters for search (delay for product search and user/run IDs)
  const debouncedProductSearch = useDebounce(
    tempFilters.product_search || "",
    500
  );
  const debouncedUserId = useDebounce(tempFilters.user_id || "", 300);
  const debouncedRunId = useDebounce(tempFilters.run_id || "", 300);

  // Run details modal
  const [runDetailsOpen, setRunDetailsOpen] = useState(false);
  const [runDetails, setRunDetails] = useState<
    RunDetailsResponse["data"] | null
  >(null);
  const [runDetailsLoading, setRunDetailsLoading] = useState(false);
  const [runDetailsError, setRunDetailsError] = useState<string | null>(null);

  // Initialize filters from URL on component mount
  useEffect(() => {
    const { filters: urlFilters, page: urlPage } = parseFiltersFromURL();
    setFilters(urlFilters);
    setTempFilters(urlFilters);
    setPagination((prev) => ({ ...prev, current_page: urlPage }));
  }, []);

  // Auto-apply filters when debounced values change
  useEffect(() => {
    const newFilters: MovementFilters = {
      movement_type: tempFilters.movement_type,
      date_from: tempFilters.date_from,
      date_to: tempFilters.date_to,
      product_search: debouncedProductSearch || undefined,
      user_id: debouncedUserId || undefined,
      run_id: debouncedRunId || undefined,
    };

    // Remove undefined values
    Object.keys(newFilters).forEach((key) => {
      if (
        newFilters[key as keyof MovementFilters] === undefined ||
        newFilters[key as keyof MovementFilters] === ""
      ) {
        delete newFilters[key as keyof MovementFilters];
      }
    });

    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [
    tempFilters.movement_type,
    tempFilters.date_from,
    tempFilters.date_to,
    debouncedProductSearch,
    debouncedUserId,
    debouncedRunId,
  ]);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchInventoryMovements(
        filters as Record<string, string | undefined>,
        pagination.current_page,
        pagination.page_size
      );

      if (response.status === "success") {
        setMovements(response.data.movements);
        setPagination(response.data.pagination);
      } else {
        throw new Error("Error loading movements");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error loading movements:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current_page, pagination.page_size]);

  // Load movements when filters or page change
  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // Update URL when filters change
  useEffect(() => {
    updateURLWithFilters(filters, pagination.current_page);
  }, [filters, pagination.current_page]);

  const handleFilterChange = (
    key: keyof MovementFilters,
    value: string | null
  ) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setTempFilters({});
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handleRowsPerPageChange = (newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      page_size: newPageSize,
      current_page: 1,
    }));
  };

  const handleRunClick = async (runId: string) => {
    setRunDetailsLoading(true);
    setRunDetailsOpen(true);
    setRunDetails(null);
    setRunDetailsError(null);

    try {
      const response = await fetchInventoryMovementRunDetails(runId);
      if (response.status === "success") {
        setRunDetails(response.data);
      } else {
        throw new Error("Error loading run details");
      }
    } catch (err) {
      setRunDetailsError(
        err instanceof Error ? err.message : "Error cargando detalles del run"
      );
      console.error("Error loading run details:", err);
    } finally {
      setRunDetailsLoading(false);
    }
  };

  const getMovementTypeChip = (movement: InventoryMovement) => {
    const config = MOVEMENT_TYPE_CONFIG[movement.movement_type];

    // Fallback para tipos de movimiento desconocidos
    const defaultConfig = {
      label: movement.movement_type || "Desconocido",
      icon: "📋",
      color: "#757575",
    };

    const displayConfig = config || defaultConfig;

    return (
      <Chip
        label={`${displayConfig.icon} ${displayConfig.label}`}
        size="small"
        sx={{
          backgroundColor: displayConfig.color + "20",
          color: displayConfig.color,
          fontWeight: 600,
        }}
      />
    );
  };

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(
      (value) => value !== undefined && value !== ""
    ).length;
  }, [filters]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ width: "100%", p: 2 }}>
        {/* Header */}
        <Typography variant="h5" gutterBottom>
          Historial de Movimientos de Inventario
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filtros{" "}
            {activeFiltersCount > 0 && `(${activeFiltersCount} activos)`}
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Movimiento</InputLabel>
                <Select
                  value={tempFilters.movement_type || ""}
                  label="Tipo de Movimiento"
                  onChange={(e) =>
                    handleFilterChange("movement_type", e.target.value)
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="addition">📦 Entrada</MenuItem>
                  <MenuItem value="adjustment">⚙️ Ajuste</MenuItem>
                  <MenuItem value="count">📋 Conteo Físico</MenuItem>
                  <MenuItem value="return">🔄 Devolución</MenuItem>
                  <MenuItem value="sale">💰 Venta</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <DatePicker
                label="Fecha desde"
                value={
                  tempFilters.date_from
                    ? createLocalDateFromString(tempFilters.date_from)
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date ? formatDateToLocal(date) : null;
                  handleFilterChange("date_from", formattedDate);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <DatePicker
                label="Fecha hasta"
                value={
                  tempFilters.date_to
                    ? createLocalDateFromString(tempFilters.date_to)
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date
                    ? formatDateToLocalEndOfDay(date)
                    : null;
                  console.log(
                    "Fecha hasta seleccionada:",
                    date,
                    "-> Formato enviado:",
                    formattedDate
                  );
                  handleFilterChange("date_to", formattedDate);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                size="small"
                fullWidth
                label="Buscar producto"
                value={tempFilters.product_search || ""}
                onChange={(e) =>
                  handleFilterChange("product_search", e.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ mr: 1, color: "action.active" }} />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                size="small"
                fullWidth
                label="Usuario ID"
                placeholder="ID del usuario"
                value={tempFilters.user_id || ""}
                onChange={(e) => handleFilterChange("user_id", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <TextField
                size="small"
                fullWidth
                label="Run ID"
                placeholder="ID del run/operación"
                value={tempFilters.run_id || ""}
                onChange={(e) => handleFilterChange("run_id", e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<ClearIcon />}
                  disabled={loading}
                >
                  Limpiar Filtros
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Results summary */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {loading
              ? "Cargando..."
              : `${pagination.total_count} movimientos encontrados`}
          </Typography>
        </Box>

        {/* Movements table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha/Hora</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Cambio</TableCell>
                  <TableCell align="right">Stock Anterior</TableCell>
                  <TableCell align="right">Stock Nuevo</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Notas</TableCell>
                  <TableCell>Run ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No se encontraron movimientos con los filtros aplicados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatMovementDateTime(movement.created_datetime)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getMovementTypeChip(movement)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getProductDisplayName(movement)}
                        </Typography>
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
                        <Typography variant="body2">
                          {movement.previous_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {movement.new_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {movement.user_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {movement.notes}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {movement.run_id ? (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<InfoIcon />}
                            onClick={() => handleRunClick(movement.run_id!)}
                          >
                            {movement.run_id.substring(0, 8)}...
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <NumberedPagination
            currentPage={pagination.current_page}
            totalPages={pagination.total_pages}
            totalCount={pagination.total_count}
            pageSize={pagination.page_size}
            onPageChange={handlePageChange}
            onPageSizeChange={handleRowsPerPageChange}
            pageSizeOptions={[25, 50, 100]}
            disabled={loading}
          />
        </Paper>

        {/* Run Details Modal */}
        <InventoryMovementsModal
          open={runDetailsOpen}
          onClose={() => setRunDetailsOpen(false)}
          runDetails={runDetails}
          loading={runDetailsLoading}
          error={runDetailsError}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default InventoryMovements;
