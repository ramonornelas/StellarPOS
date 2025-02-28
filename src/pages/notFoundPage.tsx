import React from "react";
import { Button, Container, Typography } from "@mui/material";
import classes from "./css/cart.module.css"
import { NavLink } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
	return (
		<Container maxWidth="xl" className={classes["main-container"]}>
			<Typography variant="h5" component="h1" sx={{mb:1}}>404 - Not Found Page</Typography>
			<img src="/imgs/404/404-coffe.gif" alt="404 Not Found" />
			<Button component={NavLink} to={"/"} variant="contained">Return to Home</Button>
		</Container>
	);
};
