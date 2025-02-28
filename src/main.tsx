import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<BrowserRouter>
			<SnackbarProvider maxSnack={3} autoHideDuration={1000}>
				<StyledEngineProvider injectFirst>
					<CssBaseline />
					<App />
				</StyledEngineProvider>
			</SnackbarProvider>
		</BrowserRouter>
	</React.StrictMode>
);
