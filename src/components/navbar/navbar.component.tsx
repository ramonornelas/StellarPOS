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
import ListAltIcon from '@mui/icons-material/ListAlt';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ChatIcon from "@mui/icons-material/Chat";

import React from "react";
import { appContext } from "../../appContext";
import { isCartEmpty } from "../cart/cart.motor";
import { DataContext } from "../../dataContext";

interface NavBarProps {
    applyFilter: (category: string) => void;
}

export const Navbar: React.FC<NavBarProps> = (props) => {
    const { drawerLinks } = useContext(DataContext);
    const { productsInCart } = React.useContext(appContext).cartCTX;
    const { applyFilter } = props;
    const [open, setOpen] = useState(false);
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

    const showVentasFeatureFlag = false; // Feature flag to control the visibility of "Ventas"
    const showDatePickerFeatureFlag = false; // Feature flag to control the visibility of the date picker button

    return (
        <>
            <Box sx={{ display: "flex" }}></Box>
            <AppBar position="static" sx={{ height: '80px', backgroundColor: 'white' }}> {/* Adjust the height as needed */}
                <Toolbar
                    sx={{
                        justifyContent: location.pathname === "/" ? "space-between" : "flex-end",
                    }}
                >
                    <Button
                        sx={{ display: location.pathname === "/" ? "flex" : "none" }}
                        color="inherit"
                        aria-label="menu"
                        onClick={() => setOpen(true)}
                    >
                        <MenuIcon color="primary" />

                    </Button>
                    {showVentasFeatureFlag && (
                        <Typography variant="h6" sx={{ ml: 1, textTransform: "none", fontSize: '1.5rem', color: 'primary.main' }}>
                            Ventas
                        </Typography>
                    )}

                    <Box>
                        <Button component={NavLink} to={"/"}>
                            <HomeIcon color="action" fontSize="large" />
                        </Button>
                        {showDatePickerFeatureFlag && ( // Conditionally render the date picker button
                            <Button component={NavLink} to={"/date-picker"}>
                                <DateRangeIcon color="action" fontSize="large" />
                            </Button>
                        )}
                        <Button component={NavLink} to={"/orders"}>
                            <ListAltIcon color="action" fontSize="large" />
                        </Button>
                        <Button component={NavLink} to={"/chat"}> {/* Nuevo botón para el chat */}
                            <ChatIcon color="action" fontSize="large" />
                        </Button>
                        {enableCartButton()}
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