import React, { useEffect, useState, useContext } from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { fetchCashRegisterHistory } from "../functions/apiFunctions";
import { CashRegisterHistoryItem } from "../components/cash-register/cash-register-history-item.component";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { appContext } from "../appContext";

export const CashRegisterHistoryPage: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const navigate = useNavigate();
        const { dateCTX } = useContext(appContext);
        const { selectedDate } = dateCTX;
        const dateString = selectedDate ? selectedDate.toLocaleDateString('en-CA') : "2024-12-31";

    useEffect(() => {
        const fetchHistory = async () => {
            const response = await fetchCashRegisterHistory(dateString);
            setHistory(Array.isArray(response) ? response : []);
        };
        fetchHistory();
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 6, mb: 4 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{ mb: 2 }}
            >
                Volver
            </Button>
            <Typography variant="h5" sx={{ mb: 3 }}>
                Cortes de caja del día {selectedDate ? selectedDate.toLocaleDateString('es-MX') : "hoy"}
            </Typography>
            <Box sx={{ width: "100%", maxWidth: 1000, mx: "auto" }}>
                {history.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: "center", p: 2 }}>
                        No hay cortes recientes.
                    </Typography>
                ) : (
                    history.map((item, idx) => (
                        <CashRegisterHistoryItem key={idx} item={item} />
                    ))
                )}
            </Box>
        </Container>
    );
};

export default CashRegisterHistoryPage;