import { useState, useContext, useCallback } from "react";
import {
  AppBar,
  Badge,
  Button,
  Drawer,
  Toolbar,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import MenuIcon from "@mui/icons-material/Menu";
import { NavListDrawer } from "./navbar-list-drawer.component";
import HomeIcon from "@mui/icons-material/Home";
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import { NavLink, useLocation } from "react-router-dom";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DateRangeIcon from "@mui/icons-material/DateRange";
import ChatIcon from "@mui/icons-material/Chat";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import React from "react";
import { appContext } from "../../appContext";
import { isCartEmpty } from "../cart/cart.motor";
import { DataContext } from "../../dataContext";
import { featureFlags } from "../../config/featureFlags";
import { logoff } from "../../utils/logoff";
import { NavbarSearchField } from "./navbar-searchfield";
import { useCanViewOrdersReport, useCanViewProductsAdmin } from "../users/userPermissionsContext";

// Get environment from VITE_API_STAGE
const ENV_STAGE = import.meta.env.VITE_API_STAGE;

interface NavBarProps {
  applyFilter: (category: string) => void;
  onLogoff: () => void; // Ensure onLogoff is defined in props
}

export const Navbar: React.FC<NavBarProps> = (props) => {
  const { applyFilter } = props;
  const { drawerLinks } = useContext(DataContext);
  const { productsInCart } = React.useContext(appContext).cartCTX;
  const { searchTerm, setSearchTerm } = React.useContext(appContext).searchCTX;
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openUserMenu = Boolean(anchorEl);
  const location = useLocation();
  const canViewOrdersReport = useCanViewOrdersReport();
  const canViewProductsAdmin = useCanViewProductsAdmin();

  const isHomePage = location.pathname === "/";

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm]
  );

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  const enableCartButton = () => {
    let cartButton;
    if (!isCartEmpty(productsInCart)) {
      cartButton = (
        <Button component={NavLink} to={"/cart"}>
          <ShoppingBasketIcon color="success" fontSize="large" />
          <Badge badgeContent={productsInCart.length} color="warning"></Badge>
        </Button>
      );
    } else {
      cartButton = (
        <Button component={NavLink} to={"/cart"} disabled>
          <ShoppingBasketIcon color="disabled" fontSize="large" />
        </Button>
      );
    }
    return cartButton;
  };

  const handleLogoff = () => {
    logoff(); // Use the shared logoff utility
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoffMenu = () => {
    setAnchorEl(null);
    handleLogoff();
  };

  // Get the user's initial from sessionStorage
  const stellarUserId = sessionStorage.getItem("stellar_username");
  const userInitial = stellarUserId
    ? stellarUserId.charAt(0).toUpperCase()
    : "?";

  return (
    <>
      <Box sx={{ display: "flex" }}></Box>
      <AppBar position="static" sx={{ backgroundColor: "white" }}>
        <Toolbar
          sx={{
            justifyContent: { xs: "center", md: "space-between" },
            flexWrap: { xs: "wrap", md: "nowrap" },
            gap: { xs: 1, sm: 2 },
            py: { xs: 2, sm: 0 },
          }}
        >
          {featureFlags.navbarShowCategoryFilter && (
            <Button
              sx={{ display: location.pathname === "/" ? "flex" : "none" }}
              color="inherit"
              aria-label="menu"
              onClick={() => setOpen(true)}
            >
              <MenuIcon color="primary" />
            </Button>
          )}

          <NavbarSearchField
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleSearchClear}
            placeholder="Buscar productos..."
            showOnlyOnHome={true}
            isHomePage={isHomePage}
          />

          {featureFlags.navbarShowVentas && (
            <Typography
              variant="h6"
              sx={{
                ml: 1,
                textTransform: "none",
                fontSize: "1.5rem",
                color: "primary.main",
              }}
            >
              Ventas
            </Typography>
          )}

          {/* Show environment if not PROD */}
          {ENV_STAGE !== "PROD" && ENV_STAGE && (
            <Typography
              variant="caption"
              sx={{
                ml: 2,
                color: "grey.600",
                fontWeight: 500,
                letterSpacing: 1,
                bgcolor: "grey.100",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                alignSelf: "center",
                userSelect: "none",
              }}
            >
              {ENV_STAGE} ENV
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center" }}>
            {canViewProductsAdmin && (
              <Button component={NavLink} to={"/products-admin"}>
                <Inventory2Icon color="action" fontSize="large" />
              </Button>
            )}
            {/* Home Button */}
            <Button component={NavLink} to={"/"}>
              <HomeIcon color="action" fontSize="large" />
            </Button>
            {featureFlags.navbarShowDateSelector && (
              <Button component={NavLink} to={"/date-picker"}>
                <DateRangeIcon color="action" fontSize="large" />
              </Button>
            )}
            {canViewOrdersReport && (
              <Button component={NavLink} to={"/orders"}>
                <ListAltIcon color="action" fontSize="large" />
              </Button>
            )}
            {featureFlags.navbarShowChat && (
              <Button component={NavLink} to={"/chat"}>
                <ChatIcon color="action" fontSize="large" />
              </Button>
            )}
            <Button component={NavLink} to={"/cash-register"}>
              <PointOfSaleIcon color="action" fontSize="large" />
            </Button>
            {enableCartButton()}

            {/* User Avatar */}
            <Avatar
              sx={{ bgcolor: "primary.main", cursor: "pointer", ml: 2 }}
              onClick={handleAvatarClick}
            >
              {userInitial}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={openUserMenu}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem onClick={handleLogoffMenu}>Cerrar sesión</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <NavListDrawer
          onClick={() => setOpen(false)}
          navLinks={drawerLinks}
          applyFilter={applyFilter}
        />
      </Drawer>
    </>
  );
};
