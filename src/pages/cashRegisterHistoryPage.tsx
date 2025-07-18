import React, { useEffect, useState } from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { fetchCashRegisterHistory } from "../functions/apiFunctions";
import { CashRegisterHistoryItem } from "../components/cash-register/cash-register-history-item.component";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

export const CashRegisterHistoryPage: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [limit, setLimit] = useState<number>(3);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasMoreData, setHasMoreData] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch latest records without date filter, using limit parameter
                const response = await fetchCashRegisterHistory(undefined, limit);
                const responseArray = Array.isArray(response) ? response : [];
                setHistory(responseArray);
                
                // If we received fewer records than requested, there's no more data
                setHasMoreData(responseArray.length === limit);
            } catch (error) {
                console.error('Error fetching cash register history:', error);
                setHistory([]);
                setHasMoreData(false);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [limit]);

    const loadMore = () => {
        setLimit(prev => prev + 5);
    };

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
                Últimos cortes de caja
            </Typography>
            
            {loading && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cargando...
                </Typography>
            )}
            
            <Box sx={{ width: "100%", maxWidth: 1000, mx: "auto" }}>
                {history.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: "center", p: 2 }}>
                        No hay cortes recientes.
                    </Typography>
                ) : (
                    <>
                        {history.map((item, idx) => (
                            <CashRegisterHistoryItem key={idx} item={item} />
                        ))}
                        <Box sx={{ textAlign: "center", mt: 3 }}>
                            <Button
                                variant="outlined"
                                onClick={loadMore}
                                disabled={loading || !hasMoreData}
                            >
                                {hasMoreData ? "Ver más cortes" : "No hay más cortes"}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Container>
    );
};

export default CashRegisterHistoryPage;