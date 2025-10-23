import React from "react";
import { Tabs, Tab, Box, Typography, Paper } from "@mui/material";
import ProductTable from "../components/products/product-table.component";
import InventoryEntradas from "../components/inventory/InventoryEntradas";
import {
  useCanViewProducts,
  useCanViewInventoryEntries,
  useCanViewInventoryPhysicalCount,
  useCanViewInventoryAdjustments,
} from "../components/users/userPermissionsContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const ProductsAdminPage: React.FC = () => {
  const [mainTabValue, setMainTabValue] = React.useState(0);
  const [inventoryTabValue, setInventoryTabValue] = React.useState(0);

  const canViewProducts = useCanViewProducts();
  const canViewInventoryEntries = useCanViewInventoryEntries();
  const canViewInventoryPhysicalCount = useCanViewInventoryPhysicalCount();
  const canViewInventoryAdjustments = useCanViewInventoryAdjustments();

  const canViewAnyInventory =
    canViewInventoryEntries ||
    canViewInventoryPhysicalCount ||
    canViewInventoryAdjustments;

  const handleMainTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setMainTabValue(newValue);
  };

  const handleInventoryTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setInventoryTabValue(newValue);
  };

  if (!canViewProducts && !canViewAnyInventory) {
    return (
      <div style={{ padding: "2rem" }}>
        <Typography variant="h4" color="text.secondary" align="center">
          Acceso Denegado
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          No tienes permisos para acceder a esta sección.
        </Typography>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Administrar Productos e Inventario</h2>

      <Box sx={{ borderBottom: 2, borderColor: "divider" }}>
        <Tabs
          value={mainTabValue}
          onChange={handleMainTabChange}
          aria-label="tabs principales"
          sx={{
            backgroundColor: "#fff",
            width: "fit-content",
          }}
        >
          {canViewProducts && <Tab label="Productos" {...a11yProps(0)} />}
          {canViewAnyInventory && (
            <Tab label="Inventario" {...a11yProps(canViewProducts ? 1 : 0)} />
          )}
        </Tabs>
      </Box>
      <Paper elevation={2} sx={{ width: "100%", mt: 2 }}>
        {canViewProducts && (
          <CustomTabPanel value={mainTabValue} index={0}>
            <ProductTable />
          </CustomTabPanel>
        )}

        {canViewAnyInventory && (
          <CustomTabPanel value={mainTabValue} index={canViewProducts ? 1 : 0}>
            <Box sx={{ width: "100%" }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={inventoryTabValue}
                  onChange={handleInventoryTabChange}
                  aria-label="subtabs de inventario"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {canViewInventoryEntries && (
                    <Tab label="Entradas" {...a11yProps(0)} />
                  )}
                  {canViewInventoryPhysicalCount && (
                    <Tab
                      label="Conteo Físico"
                      {...a11yProps(canViewInventoryEntries ? 1 : 0)}
                    />
                  )}
                  {canViewInventoryAdjustments && (
                    <Tab
                      label="Ajustes de Inventario"
                      {...a11yProps(
                        (canViewInventoryEntries ? 1 : 0) +
                          (canViewInventoryPhysicalCount ? 1 : 0)
                      )}
                    />
                  )}
                </Tabs>
              </Box>

              {canViewInventoryEntries && (
                <CustomTabPanel value={inventoryTabValue} index={0}>
                  <Box sx={{ p: 2 }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Entradas de Inventario
                    </Typography>
                    <InventoryEntradas />
                  </Box>
                </CustomTabPanel>
              )}

              {canViewInventoryPhysicalCount && (
                <CustomTabPanel
                  value={inventoryTabValue}
                  index={canViewInventoryEntries ? 1 : 0}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "300px",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Typography variant="h6" color="text.secondary">
                      Conteo Físico
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Esta sección estará disponible próximamente
                    </Typography>
                  </Box>
                </CustomTabPanel>
              )}

              {canViewInventoryAdjustments && (
                <CustomTabPanel
                  value={inventoryTabValue}
                  index={
                    (canViewInventoryEntries ? 1 : 0) +
                    (canViewInventoryPhysicalCount ? 1 : 0)
                  }
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "300px",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Typography variant="h6" color="text.secondary">
                      Ajustes de Inventario
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Esta sección estará disponible próximamente
                    </Typography>
                  </Box>
                </CustomTabPanel>
              )}
            </Box>
          </CustomTabPanel>
        )}
      </Paper>
    </div>
  );
};

export default ProductsAdminPage;
