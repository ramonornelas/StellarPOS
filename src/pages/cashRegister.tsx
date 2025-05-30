import React, { useState, useEffect, useContext } from "react";
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Alert,
} from "@mui/material";
import classes from "./css/orders.module.css";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { postOpenCashRegister, putCloseCashRegister, fetchOrderTotalsByCashRegister } from "../functions/apiFunctions";
import { useNavigate, useLocation } from "react-router-dom";
import { appContext } from "../appContext";
import { permissions } from "../config/permissions"; // <-- Add this import

export const CashRegister: React.FC = () => {
    const { dateCTX } = useContext(appContext);
    const { selectedDate } = dateCTX;
    const dateString = selectedDate ? selectedDate.toLocaleDateString('en-CA') : "2024-12-31";
    const [amount, setAmount] = useState<string>("");
    const [closeAmount, setCloseAmount] = useState<string>("");
    const [success, setSuccess] = useState<boolean>(false);
    const [closeSuccess, setCloseSuccess] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [closeError, setCloseError] = useState<string>("");
    const [isOpen, setIsOpen] = useState<boolean>(
        !!sessionStorage.getItem("cashRegisterId")
    );
    const [justOpened, setJustOpened] = useState<boolean>(false);
    const [justClosed, setJustClosed] = useState<boolean>(false);
    const [cashSales, setCashSales] = useState<number>(0);
    const navigate = useNavigate();
    const location = useLocation();
    const redirectMessage = location.state?.message || "";

    useEffect(() => {
        if (justOpened) {
            const timer = setTimeout(() => {
                navigate("/");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [justOpened, navigate]);

    useEffect(() => {
        if (justClosed) {
            const timer = setTimeout(() => {
                window.location.reload();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [justClosed]);

    useEffect(() => {
        // Solo busca el total si la caja está abierta
        if (isOpen) {
            const fetchTotals = async () => {
                const cashRegisterId = sessionStorage.getItem("cashRegisterId");
                if (!cashRegisterId) return;
                const response = await fetchOrderTotalsByCashRegister(cashRegisterId);
                let cash = 0;
                if (response && response.paymentMethodTotals) {
                    cash = parseFloat(response.paymentMethodTotals.cash ?? "0");
                }
                setCashSales(isNaN(cash) ? 0 : cash);
            };
            fetchTotals();
        }
    }, [isOpen, dateString]);

    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            setError("Por favor ingresa un monto válido mayor a 0.");
            setSuccess(false);
            return;
        }

        const result = await postOpenCashRegister({
            opening_amount: value,
            opened_at: new Date().toISOString(),
            status: "open",
            opened_user_id: sessionStorage.getItem("stellar_userid"),
        });

        if (result && result.id) {
            sessionStorage.setItem("cashRegisterId", result.id);
            setSuccess(true);
            setError("");
            setAmount("");
            setIsOpen(true);
            setJustOpened(true);
            navigate(".", { replace: true, state: {} });
        } else {
            setError("No se pudo abrir la caja. Intenta de nuevo.");
            setSuccess(false);
        }
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();

        const value = parseFloat(closeAmount);
        if (isNaN(value) || value < 0) {
            setCloseError("Por favor ingresa un monto válido.");
            setCloseSuccess(false);
            return;
        }

        const cashRegisterId = sessionStorage.getItem("cashRegisterId");
        if (!cashRegisterId) {
            setCloseError("No se encontró una caja abierta.");
            setCloseSuccess(false);
            return;
        }

        const result = await putCloseCashRegister({
            id: cashRegisterId,
            closing_amount: value,
            closed_at: new Date().toISOString(),
            status: "closed",
            closed_user_id: sessionStorage.getItem("stellar_userid"),
            cash_sales: cashSales,
        });

        if (result && result.status === "closed") {
            sessionStorage.removeItem("cashRegisterId");
            setCloseSuccess(true);
            setCloseError("");
            setIsOpen(false);
            setCloseAmount("");
            setJustClosed(true);
            navigate(".", { replace: true, state: {} });
        } else {
            setCloseError("No se pudo cerrar la caja. Intenta de nuevo.");
            setCloseSuccess(false);
        }
    };

    return (
        <Container maxWidth="sm" className={classes["main-container"]}>
            <Box display="flex" flexDirection="column" alignItems="center" mt={6}>
                {/* Mensaje de redirección */}
                {redirectMessage && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {redirectMessage}
                    </Alert>
                )}
                <PointOfSaleIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                {(!isOpen || justOpened) && (!justClosed) && (
                    <Typography variant="h5" component="h1" className={classes.header}>
                        Apertura de Caja
                    </Typography>
                )}
                {!((!isOpen || justOpened) && (!justClosed)) && (
                    <Typography variant="h5" component="h1" className={classes.header}>
                        Cierre de Caja
                    </Typography>
                )}
                {justClosed ? (
                    <Alert severity="success" sx={{ mt: 4 }}>
                        ¡Caja cerrada correctamente!
                    </Alert>
                ) : !isOpen ? (
                    <>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Ingresa el monto inicial en caja para comenzar el día.
                        </Typography>
                        <Box
                            component="form"
                            onSubmit={handleOpen}
                            sx={{
                                width: "100%",
                                maxWidth: 350,
                                mx: "auto",
                                mb: 2,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <TextField
                                label="Monto de apertura"
                                variant="outlined"
                                fullWidth
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                type="number"
                                inputProps={{ min: 0, step: "0.01" }}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="large"
                            >
                                Abrir Caja
                            </Button>
                        </Box>
                        {success && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                ¡Caja abierta correctamente! Ya puedes comenzar a operar.
                            </Alert>
                        )}
                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </>
                ) : justOpened ? (
                    <Alert severity="success" sx={{ mt: 4 }}>
                        ¡Caja abierta correctamente! Ya puedes comenzar a operar.
                    </Alert>
                ) : (
                    <>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Ingresa el monto final en caja para cerrar el día.
                        </Typography>
                        <Box component="form" onSubmit={handleClose} width="100%" sx={{ maxWidth: 350, mx: "auto", mb: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <TextField
                                label="Monto de cierre"
                                variant="outlined"
                                fullWidth
                                value={closeAmount}
                                onChange={(e) => setCloseAmount(e.target.value)}
                                type="number"
                                inputProps={{ min: 0, step: "0.01" }}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                fullWidth
                                size="large"
                            >
                                Cerrar Caja
                            </Button>
                        </Box>
                        {closeSuccess && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                ¡Caja cerrada correctamente!
                            </Alert>
                        )}
                        {closeError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {closeError}
                            </Alert>
                        )}
                    </>
                )}
                {/* Botón para consultar la lista de cortes, solo si tiene permiso */}
                {permissions.canViewCashRegisterHistory() && (
                    <Box mt={4} width="100%" display="flex" justifyContent="center">
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => navigate("/cash-register-history")}
                        >
                            Cortes de caja del día
                        </Button>
                    </Box>
                )}
            </Box>
        </Container>
    );
};

export default CashRegister;