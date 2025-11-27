import React, { useEffect } from "react";
import { Tabs, Tab, Box, Typography, Paper } from "@mui/material";
import ProductTable from "../components/products/product-table.component";
import InventoryEntradas from "../components/inventory/InventoryEntradas";
import InventoryConteoFisico from "../components/inventory/InventoryConteoFisico";
import InventoryAdjust from "../components/inventory/InventoryAdjust";
import InventoryMovements from "../components/inventory/InventoryMovements";
import {
  useCanViewProducts,
  useCanViewInventoryEntries,
  useCanViewInventoryPhysicalCount,
  useCanViewInventoryAdjustments,
} from "../components/users/userPermissionsContext";
import { useTabStore } from "../components/inventory/stores/tabStore";

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
  // Zustand store
  const { mainTab, inventoryTab, setMainTab, setInventoryTab, syncFromURL } =
    useTabStore();

  // Permissions
  const canViewProducts = useCanViewProducts();
  const canViewInventoryEntries = useCanViewInventoryEntries();
  const canViewInventoryPhysicalCount = useCanViewInventoryPhysicalCount();
  const canViewInventoryAdjustments = useCanViewInventoryAdjustments();

  const canViewAnyInventory =
    canViewInventoryEntries ||
    canViewInventoryPhysicalCount ||
    canViewInventoryAdjustments;

  // Sync from URL on mount (for direct URL access or refresh)
  useEffect(() => {
    syncFromURL();
  }, [syncFromURL]);

  // Convert tab keys to indices based on permissions
  const getMainTabIndex = (): number => {
    if (mainTab === "products" && canViewProducts) return 0;
    if (mainTab === "inventory" && canViewAnyInventory) {
      return canViewProducts ? 1 : 0;
    }
    return 0;
  };

  const getInventoryTabIndex = (): number => {
    let currentIndex = 0;

    if (inventoryTab === "entradas" && canViewInventoryEntries)
      return currentIndex;
    if (canViewInventoryEntries) currentIndex++;

    if (inventoryTab === "conteo" && canViewInventoryPhysicalCount)
      return currentIndex;
    if (canViewInventoryPhysicalCount) currentIndex++;

    if (inventoryTab === "ajustes" && canViewInventoryAdjustments)
      return currentIndex;
    if (canViewInventoryAdjustments) currentIndex++;

    if (inventoryTab === "historial") return currentIndex;

    return 0;
  };

  // Handle tab changes
  const handleMainTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    if (canViewProducts && newValue === 0) {
      setMainTab("products");
    } else if (canViewAnyInventory && newValue === (canViewProducts ? 1 : 0)) {
      setMainTab("inventory");
    }
  };

  const handleInventoryTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    let currentIndex = 0;

    if (canViewInventoryEntries) {
      if (newValue === currentIndex) {
        setInventoryTab("entradas");
        return;
      }
      currentIndex++;
    }

    if (canViewInventoryPhysicalCount) {
      if (newValue === currentIndex) {
        setInventoryTab("conteo");
        return;
      }
      currentIndex++;
    }

    if (canViewInventoryAdjustments) {
      if (newValue === currentIndex) {
        setInventoryTab("ajustes");
        return;
      }
      currentIndex++;
    }

    if (newValue === currentIndex) {
      setInventoryTab("historial");
    }
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
          value={getMainTabIndex()}
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
          <CustomTabPanel value={getMainTabIndex()} index={0}>
            <ProductTable />
          </CustomTabPanel>
        )}

        {canViewAnyInventory && (
          <CustomTabPanel
            value={getMainTabIndex()}
            index={canViewProducts ? 1 : 0}
          >
            <Box sx={{ width: "100%" }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={getInventoryTabIndex()}
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
                      label="Ajustes"
                      {...a11yProps(
                        (canViewInventoryEntries ? 1 : 0) +
                          (canViewInventoryPhysicalCount ? 1 : 0)
                      )}
                    />
                  )}
                  <Tab
                    label="Historial"
                    {...a11yProps(
                      (canViewInventoryEntries ? 1 : 0) +
                        (canViewInventoryPhysicalCount ? 1 : 0) +
                        (canViewInventoryAdjustments ? 1 : 0)
                    )}
                  />
                </Tabs>
              </Box>

              {canViewInventoryEntries && (
                <CustomTabPanel value={getInventoryTabIndex()} index={0}>
                  <Box sx={{ p: 2 }}>
                    <InventoryEntradas />
                  </Box>
                </CustomTabPanel>
              )}

              {canViewInventoryPhysicalCount && (
                <CustomTabPanel
                  value={getInventoryTabIndex()}
                  index={canViewInventoryEntries ? 1 : 0}
                >
                  <Box sx={{ p: 2 }}>
                    <InventoryConteoFisico />
                  </Box>
                </CustomTabPanel>
              )}

              {canViewInventoryAdjustments && (
                <CustomTabPanel
                  value={getInventoryTabIndex()}
                  index={
                    (canViewInventoryEntries ? 1 : 0) +
                    (canViewInventoryPhysicalCount ? 1 : 0)
                  }
                >
                  <Box sx={{ p: 2 }}>
                    <InventoryAdjust />
                  </Box>
                </CustomTabPanel>
              )}

              <CustomTabPanel
                value={getInventoryTabIndex()}
                index={
                  (canViewInventoryEntries ? 1 : 0) +
                  (canViewInventoryPhysicalCount ? 1 : 0) +
                  (canViewInventoryAdjustments ? 1 : 0)
                }
              >
                <Box sx={{ p: 2 }}>
                  <InventoryMovements />
                </Box>
              </CustomTabPanel>
            </Box>
          </CustomTabPanel>
        )}
      </Paper>
    </div>
  );
};

export default ProductsAdminPage;
