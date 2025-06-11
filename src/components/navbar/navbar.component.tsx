import { useState, useContext } from "react";
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
import { permissions } from "../../config/permissions";
import { featureFlags } from "../../config/featureFlags";
import { logoff } from "../../utils/logoff";

interface NavBarProps {
    applyFilter: (category: string) => void;
    onLogoff: () => void; // Ensure onLogoff is defined in props
}

export const Navbar: React.FC<NavBarProps> = (props) => {
    const { applyFilter } = props;
    const { drawerLinks } = useContext(DataContext);
    const { productsInCart } = React.useContext(appContext).cartCTX;
    const [open, setOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openUserMenu = Boolean(anchorEl);
    const location = useLocation();

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
    const userInitial = stellarUserId ? stellarUserId.charAt(0).toUpperCase() : "?";

    return (
        <>
            <Box sx={{ display: "flex" }}></Box>
            <AppBar position="static" sx={{ height: "80px", backgroundColor: "white" }}>
                <Toolbar
                    sx={{
                        justifyContent:
                            location.pathname === "/" && featureFlags.navbarShowCategoryFilter
                                ? "space-between"
                                : "flex-end",
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

                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        {/* Home Button */}
                        <Button component={NavLink} to={"/"}>
                            <HomeIcon color="action" fontSize="large" />
                        </Button>
                        {featureFlags.navbarShowDateSelector && (
                            <Button component={NavLink} to={"/date-picker"}>
                                <DateRangeIcon color="action" fontSize="large" />
                            </Button>
                        )}
                        {permissions.navbarCanViewOrdersReport() && (
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