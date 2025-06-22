import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { groupProducts, isCartEmpty } from "./cart.motor";
import { CartItem } from "./cart-item.component";
import { Box } from "@mui/material";
import classes from "./css/cart-list.module.css";
import { CalcTotal } from "./calc-total.component";
import { appContext } from "../../appContext";

export const CartList: React.FC = () => {
    const { productsInCart } = React.useContext(appContext).cartCTX;
    const productsGrouped = groupProducts(productsInCart);

    const tableRef = React.useRef<HTMLTableElement>(null);
    const [tableWidth, setTableWidth] = React.useState<number>(0);

    React.useLayoutEffect(() => {
        if (tableRef.current) {
            setTableWidth(tableRef.current.offsetWidth);
        }
    }, [productsGrouped.length]);

    return (
        <Box sx={{ flexGrow: 1 }} className={classes["cart-fixed-size"]}>
            <TableContainer
                component={Paper}
                className={classes["cart-container"]}
                elevation={5}
                square
                sx={{ width: "100%", overflowX: "auto" }}
            >
                <Table
                    ref={tableRef}
                    aria-label="spanning table"
                    className={isCartEmpty(productsInCart) ? classes["table-body"] : ""}
                    sx={{ tableLayout: "fixed", width: "100%" }}
                >
                    <TableHead>
                        <TableRow className={classes["table-header"]}>
                            <TableCell>Producto</TableCell>
                            <TableCell align="center">Cant.</TableCell>
                            <TableCell align="right">Precio</TableCell>
                            <TableCell align="right">Suma</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {productsGrouped.map((row) => (
                            <CartItem
                                key={`${row.id}-${row.product_variant_id}`}
                                productInfo={row}
                                tableWidth={tableWidth}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <CalcTotal />
        </Box>
    );
};
