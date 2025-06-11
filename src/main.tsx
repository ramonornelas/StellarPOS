import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// Close button component for snackbars
const SnackbarCloseButton = ({ snackbarKey }: { snackbarKey: string | number }) => {
    const { closeSnackbar } = useSnackbar();
    return (
        <IconButton
            onClick={() => closeSnackbar(snackbarKey)}
            sx={{ color: "white", fontSize: 32 }}
        >
            <CloseIcon sx={{ fontSize: 32 }} />
        </IconButton>
    );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <SnackbarProvider
                maxSnack={3}
                autoHideDuration={1000}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                action={(key) => <SnackbarCloseButton snackbarKey={key} />}
            >
                <StyledEngineProvider injectFirst>
                    <CssBaseline />
                    <App />
                </StyledEngineProvider>
            </SnackbarProvider>
        </BrowserRouter>
    </React.StrictMode>
);
