import { Box, Button, Modal, Paper, Typography, TextField, InputAdornment, IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import { calcTotal, groupProducts, isCartEmpty } from "./cart.motor";
import classes from "./css/calc-total.module.css";
import React, { useContext, useState, useEffect } from "react";
import { appContext } from "../../appContext";
import { generateNewOrderId, getLastOrderId } from "../orders/order.motor";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { openSnackBarOrderRegistered, openSnackBarSplitPaymentRegistered } from "../snackbar/snackbar.motor";
import { postOrderToApi } from '../../functions/apiFunctions';
import { mapPaymentMethod, formatCurrency } from '../../functions/generalFunctions';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { PaymentItem } from "./cart-payment-item.component";
import { DataContext } from '../../dataContext';

export const CalcTotal: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { dateCTX } = useContext(appContext);
	const { selectedDate } = dateCTX;
	const { productsInCart, setProductsInCart } = React.useContext(appContext).cartCTX;
	const { splitPayments, setSplitPayments } = useContext(appContext).paymentCTX;
	const productsGrouped = groupProducts(productsInCart);
	const total = calcTotal(productsGrouped);
	const [open, setOpen] = React.useState(false);
	const [showSplitFields, setShowSplitFields] = useState(false);
	const [splitAmount, setSplitAmount] = useState<number | null>(null);
	const [splitAmountError, setSplitAmountError] = useState<boolean>(false);
	const [showSplitDetails, setShowSplitDetails] = useState(false);
	const [showDiscount, setShowDiscount] = useState(false);
	const [discount, setDiscount] = useState<number>(0);
	const [discountPercentage, setDiscountPercentage] = useState<number | "custom" | null>(0);
	const [customDiscountError, setCustomDiscountError] = useState(false);
	const [showCustomDiscount, setShowCustomDiscount] = useState(false);
	const [totalWithDiscount, setTotalWithDiscount] = useState<number>(total);
	const [showTip, setShowTip] = useState(false);
	const [tipPercentage, setTipPercentage] = useState<number | "custom">(0);
	const [tipAmount, setTipAmount] = useState<number>(0);
	const [totalWithTip, setTotalWithTip] = useState<number>(total);
	const [showCustomTip, setShowCustomTip] = useState(false);
	const [customTipError, setCustomTipError] = useState<boolean>(false);
	const [showNotes, setShowNotes] = useState(false);
	const [notes, setNotes] = useState<string>("");
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);
	const { fetchData } = useContext(DataContext);

	useEffect(() => {
		if (splitPayments.length <= 0) {
			setShowSplitDetails(false);
		}
	}, [splitPayments]);

	useEffect(() => {
		if (open) {
			modalInitialState();
		}
	}, [open]);

	useEffect(() => {
		if (typeof tipPercentage === 'number' && !Number.isNaN(tipPercentage) && tipPercentage > 0) {
			handleTipPercentage(tipPercentage)
		}
	}, [totalWithDiscount]);

	const tipOptions = [
		{ value: 0, label: "0%" },
		{ value: 0.10, label: "10%" },
		{ value: 0.15, label: "15%" },
		{ value: "custom", label: "Otro" }
	];

	const discountOptions = [
		{ value: 0, label: "0%" },
		{ value: 0.10, label: "10%" },
		{ value: 0.20, label: "20%" },
		{ value: "custom", label: "Otro" }
	];

	//Functions
	const addNewOrder = async (paymentMethod: string) => {
		if (paymentMethod === 'split') {
			const { remainingAmount } = calculateRemainingAmount();
			if (remainingAmount != 0) {
				if (remainingAmount > 0) {
					alert('No se puede finalizar el pago. Aún resta ' + formatCurrency(remainingAmount) + ' por pagar.')
				} else
					alert('No se puede finalizar el pago. El monto pagado es mayor al total de la cuenta.')
				return; // Exit the function if the remaining amount is greater than 0 and payment method is Split
			}
		} else {
			if (showCustomTip && tipAmount === 0) {
				setCustomTipError(true);
				return;
			}
		}

		const dateString = selectedDate ? selectedDate.toLocaleDateString('en-CA') : "2024-12-31";
		getLastOrderId(dateString).then(lastOrderId => {
			const newOrderId = generateNewOrderId(lastOrderId);
			const newOrderTicket = {
				date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : new Date().toISOString().slice(0, 10),
				ticket: newOrderId,
				subtotal: total,
				payment_method: paymentMethod,
				products: productsInCart,
				split_payments: (paymentMethod === 'split' && splitPayments.length > 0) ? splitPayments : [],
				discount: discount,
				tip: tipAmount,
				notes: notes
			};

			handlePostOrder();

			async function handlePostOrder() {
				const result = await postOrderToApi(newOrderTicket);
				if (result) {
					setShowSplitFields(false);
					openSnackBarOrderRegistered(newOrderTicket.ticket);
					// Update the local state after the order is successfully created in the database
					setProductsInCart([]);
					setSplitPayments([]);
					handleClose();
					await fetchData();
					if (location.pathname !== "/") {
						navigate("/");
					}
				}
			}
		});
	};

	const calculateRemainingAmount = () => {
		const totalSplitPayments = splitPayments.reduce((acc, payment) => acc + payment.amount, 0);
		let remainingAmount = 0;
		if (tipAmount > 0)
			remainingAmount = totalWithTip - totalSplitPayments
		else if (discount > 0)
			remainingAmount = totalWithDiscount - totalSplitPayments
		else
			remainingAmount = total - totalSplitPayments
		return { totalSplitPayments, remainingAmount };
	};

	//Toggle functions
	const closeOtherToggles = (toggle: string) => {
		if (toggle !== 'discount') setShowDiscount(false);
		if (toggle !== 'tip') setShowTip(false);
		if (toggle !== 'split') setShowSplitDetails(false);
		if (toggle !== 'notes') setShowNotes(false)
	};

	const handleToggleNotes = () => {
		setShowNotes(!showNotes);
		closeOtherToggles('notes');
	};

	const handleToggleDiscount = () => {
		setShowDiscount(!showDiscount);
		closeOtherToggles('discount');
	};

	const handleToggleTip = () => {
		setShowTip(!showTip);
		closeOtherToggles('tip');
	};

	const handleToggleSplitDetails = () => {
		setShowSplitDetails(!showSplitDetails);
		closeOtherToggles('split');
	};

	const enableCartButton = () => {
		let cartButton;
		if (!isCartEmpty(productsInCart)) {
			cartButton = (
				<Button variant="contained" color="success" onClick={handleOpen}>
					<ShoppingBasketIcon sx={{ mr: 2 }} />
					Pagar
				</Button>
			);
		} else {
			cartButton = (
				<Button variant="contained" color="success" disabled>
					<ShoppingBasketIcon sx={{ mr: 2 }} />
					Pagar
				</Button>
			);
		}
		return cartButton;
	};

	//Split payment functions
	const handleSplitClick = () => {
		setShowSplitFields(!showSplitFields);
	};

	const handleSplitAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		let splitAmount = 0;
		if (event.target.value != '')
			splitAmount = parseFloat(event.target.value)
		setSplitAmount(splitAmount);
	};

	const addNewSplitPayment = (paymentMethod: string) => {
		if (typeof splitAmount === 'number' && !Number.isNaN(splitAmount)) {
			const { remainingAmount } = calculateRemainingAmount();
			if (splitAmount <= 0) {
				alert('El pago debe ser mayor a $0.00');
				return; // Exit the function if the split amount is greater than the remaining amount
			}
			if (splitAmount > remainingAmount) {
				alert('El pago (' + formatCurrency(splitAmount) + ') no puede ser mayor al restante por pagar (' + formatCurrency(remainingAmount) + ').');
				return; // Exit the function if the split amount is greater than the remaining amount
			}
			const newId = splitPayments.length > 0 ? splitPayments[splitPayments.length - 1].id + 1 : 1;
			const splitPayment = {
				id: newId,
				amount: splitAmount,
				payment_method: paymentMethod,
			};
			setSplitPayments([...splitPayments, splitPayment]);
			setSplitAmountError(false);
			setSplitAmount(null);
			const splitAmountField = document.getElementById('splitAmountField') as HTMLInputElement;
			if (splitAmountField) {
				splitAmountField.value = '';
			}
			setShowCustomTip(false);
			openSnackBarSplitPaymentRegistered(splitAmount, mapPaymentMethod(paymentMethod));
		} else {
			setSplitAmountError(true);
		}
	};

	//Tip functions
	const addTipToOrder = (tipAmount: number) => {
		setTipAmount(tipAmount);
		const totalWithTip = totalWithDiscount + tipAmount;
		setTotalWithTip(totalWithTip);
	};

	const handleTipPercentage = (percentage: number | "custom") => {
		if (percentage === "custom") {
			handleCustomTip();
		} else {
			setShowCustomTip(false);
			const tipAmount = totalWithDiscount * percentage;
			addTipToOrder(tipAmount);
		}
		setTipPercentage(percentage);
	};

	const handleCustomTipChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		let tipAmount = 0;
		if (event.target.value != '')
			tipAmount = parseFloat(event.target.value);
		addTipToOrder(tipAmount);
	};

	const handleCustomTip = () => {
		addTipToOrder(0);
		setShowCustomTip(true);
	};

	//Discount functions
	const addDiscountToOrder = (discount: number) => {
		setDiscount(discount);
		const totalWithDiscount = total - (discount);
		setTotalWithDiscount(totalWithDiscount);
	};

	const handleDiscountPercentage = (percentage: number | "custom") => {
		if (percentage === "custom") {
			handleCustomDiscount();
		} else {
			setShowCustomDiscount(false);
			const discount = total * percentage;
			addDiscountToOrder(discount);
		}
		setDiscountPercentage(percentage);
	}

	const handleCustomDiscount = () => {
		addDiscountToOrder(0);
		setShowCustomDiscount(true);
	};

	const handleCustomDiscountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(event.target.value);
		if (isNaN(value) || value < 0) {
			setCustomDiscountError(true);
		} else {
			setCustomDiscountError(false);
			addDiscountToOrder(value);
		}
	};

	//Notes functions
	const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setNotes(event.target.value);
	};

	//Initial state for the modal
	const modalInitialState = () => {
		//Split payments
		setSplitAmount(0);
		setShowSplitFields(false);
		setShowSplitDetails(false);
		setSplitAmountError(false);
		//Tip
		setTipAmount(0);
		setTipPercentage(0);
		setTotalWithTip(total);
		setShowTip(false);
		setShowCustomTip(false);
		setCustomTipError(false);
		//Discount
		setDiscount(0);
		setDiscountPercentage(0);
		setTotalWithDiscount(total);
		setShowDiscount(false);
		setShowCustomDiscount(false);
		setCustomDiscountError(false);
		//Notes
		setShowNotes(false);
		setNotes("");
	}

	const { totalSplitPayments, remainingAmount } = calculateRemainingAmount();

	return (
		<Paper className={classes["container-total"]} elevation={5} square>
			<Typography variant="body1" component="h2" className={classes["total-font"]}>
				Total: {formatCurrency(total)}
			</Typography>
			{enableCartButton()}
			<Modal
				open={open}
				onClose={handleClose}
				aria-labelledby="modal-modal-title"
				aria-describedby="modal-modal-description"
			>
				<Box className={classes["modal-style"]}>
					<Typography id="modal-modal-title" variant="h5">
						<strong>Pagar cuenta</strong>
					</Typography>
					<Box sx={{ mt: 2 }} />
					<Typography id="modal-modal-title" variant="h5">
						{(discount > 0) ? 'Subtotal' : 'Total'}: {formatCurrency(total)}
					</Typography>
					{showSplitFields && (
						<Typography id="modal-modal-title" variant="body1" component="h3">
							Restante: {formatCurrency(remainingAmount)}
						</Typography>
					)}
					<Box sx={{ mt: 2, display: "flex", flexDirection: "column" }}></Box>
					<Box sx={{ display: "flex", flexDirection: "column" }}>
						<Box display="flex" alignItems="center">
							<IconButton onClick={handleToggleDiscount}>
								{showDiscount ? <ExpandLess /> : <ExpandMore />}
							</IconButton>
							<Typography id="modal-modal-title" variant="body1" component="h2" align="left">
								{discount > 0 ? (
									<div>
										Descuento: -{formatCurrency(discount)} = {formatCurrency(totalWithDiscount)}
									</div>
								) : (
									<div>
										Descuento
									</div>
								)}
							</Typography>
						</Box>
						{showDiscount && (
							<>
								<Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", mt: 2 }}>
									<div>
										<ToggleButtonGroup
											className={classes["toggle-button-group"]}
											color="primary"
											value={discountPercentage}
											exclusive
											onChange={(_, newDiscount) => handleDiscountPercentage(newDiscount)}
											aria-label="discount"
										>
											{discountOptions.map(option => (
												<ToggleButton
													key={option.value}
													value={option.value}
													aria-label={option.label}
													className={classes["toggle-button"]}
												>
													{option.label}
												</ToggleButton>
											))}
										</ToggleButtonGroup>
									</div>
								</Box>
								{showCustomDiscount && (
									<Box sx={{ display: "flex", flexDirection: "column" }}>
										<TextField
											id="customDiscountField"
											required
											size="small"
											sx={{ mt: 2 }}
											onChange={handleCustomDiscountChange}
											label="Descuento"
											InputProps={{
												startAdornment: <InputAdornment position="start">$</InputAdornment>,
												inputProps: { min: 0, step: "any" },
											}}
											variant="standard"
											margin="dense"
											type="number"
											error={customDiscountError}
											helperText={customDiscountError ? "Falta importe" : ""}
										/>
									</Box>
								)}
								<Box sx={{ mt: 2 }}></Box>
							</>
						)}
						<Box display="flex" alignItems="center">
							<IconButton onClick={handleToggleTip}>
								{showTip ? <ExpandLess /> : <ExpandMore />}
							</IconButton>
							{tipAmount > 0 ? (
								<div>
									Propina: +{formatCurrency(tipAmount)} = {formatCurrency(totalWithTip)}
								</div>
							) : (
								<div>
									Propina
								</div>
							)}
						</Box>
						{showTip && (
							<>
								<Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", mt: 2 }}>
									<div>
										<ToggleButtonGroup
											className={classes["toggle-button-group"]}
											color="primary"
											value={tipPercentage}
											exclusive
											onChange={(_, newTipPercentage) => handleTipPercentage(newTipPercentage)}
											aria-label="tip percentage"
										>
											{tipOptions.map(option => (
												<ToggleButton
													key={option.value}
													value={option.value}
													aria-label={option.label}
													className={classes["toggle-button"]}
												>
													{option.label}
												</ToggleButton>
											))}
										</ToggleButtonGroup>
									</div>
								</Box>
								{showCustomTip && (
									<Box sx={{ display: "flex", flexDirection: "column" }}>
										<TextField
											id="customTipField"
											required
											size="small"
											sx={{ mt: 2 }}
											onChange={handleCustomTipChange}
											label="Propina"
											InputProps={{
												startAdornment: <InputAdornment position="start">$</InputAdornment>,
												inputProps: { min: 0, step: "any" },
											}}
											variant="standard"
											margin="dense"
											type="number"
											error={customTipError}
											helperText={customTipError ? "Falta importe" : ""}
											value={tipAmount}
										/>
									</Box>
								)}
								<Box sx={{ mt: 2 }}></Box>
							</>
						)}
						{showSplitFields && (
							<>
								{totalSplitPayments > 0 && (
									<>
										<Box display="flex" alignItems="center">
											<IconButton onClick={handleToggleSplitDetails}>
												{showSplitDetails ? <ExpandLess /> : <ExpandMore />}
											</IconButton>
											<Typography id="modal-modal-title" variant="body1" component="h2" align="left">
												Pagos: -{formatCurrency(totalSplitPayments)} = {formatCurrency(remainingAmount)}
											</Typography>
										</Box>
									</>
								)}
								{showSplitDetails && (
									<Box sx={{ mt: 2, display: "flex", flexDirection: "column" }}>
										<Table aria-label="spanning table">
											<TableHead>
												<TableRow className={classes["table-header"]}>
													<TableCell>Importe</TableCell>
													<TableCell>Método</TableCell>
													<TableCell></TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{splitPayments.map((payment) => (
													<PaymentItem key={payment.id} payment={payment} />
												))}
											</TableBody>
										</Table>
									</Box>
								)}
							</>
						)}
						<Box display="flex" alignItems="center">
							<IconButton onClick={handleToggleNotes}>
								{showNotes ? <ExpandLess /> : <ExpandMore />}
							</IconButton>
							<Typography id="modal-modal-title" variant="body1" component="h2" align="left">
								{notes && notes.trim().length > 0 ? (
									<div>
										Notas {notes && notes.trim().length > 0 ? "✅" : ""}
									</div>
								) : (
									<div>
										Notas
									</div>
								)}
							</Typography>
						</Box>
						{showNotes && (
							<TextField
								id="notes"
								label="Notas"
								onChange={handleNotesChange}
								multiline
								rows={2}
								variant="outlined"
								style={{ margin: '20px 0' }}
								value={notes}
							/>
						)}
						<Box sx={{ mt: 2 }} />
						{showSplitFields && (
							<TextField
								id="splitAmountField"
								required
								size="small"
								onChange={handleSplitAmountChange}
								label="Importe a pagar"
								InputProps={{
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
									inputProps: { min: 0, step: "any" },
								}}
								variant="standard"
								margin="dense"
								type="number"
								error={splitAmountError}
								helperText={splitAmountError ? "Falta importe" : ""}
							/>
						)}
						{!showSplitFields && (
							<Button
								size="small"
								color="primary"
								variant="outlined"
								sx={{ mt: 2 }}
								onClick={handleSplitClick}
							>
								{"Agregar varios pagos >>"}
							</Button>
						)}
						<Button
							size="small"
							color="success"
							variant={showSplitFields ? "outlined" : "contained"}
							sx={{ mt: 2 }}
							onClick={() => {
								if (showSplitFields) {
									addNewSplitPayment('cash');
								} else {
									addNewOrder('cash');
								}
							}}
						>
							{showSplitFields ? "Agregar importe en efectivo" : "Pago total en efectivo"}
						</Button>
						<Button
							size="small"
							color="success"
							variant={showSplitFields ? "outlined" : "contained"}
							sx={{ mt: 2 }}
							onClick={() => {
								if (showSplitFields) {
									addNewSplitPayment('card');
								} else {
									addNewOrder('card');
								}
							}}
						>
							{showSplitFields ? "Agregar importe en tarjeta" : "Pago total en tarjeta"}
						</Button>
						<Button
							size="small"
							color="success"
							variant={showSplitFields ? "outlined" : "contained"}
							sx={{ mt: 2 }}
							onClick={() => {
								if (showSplitFields) {
									addNewSplitPayment('transfer');
								} else {
									addNewOrder('transfer');
								}
							}}
						>
							{showSplitFields ? "Agregar importe en transferencia" : "Pago total en transferencia"}
						</Button>
						{showSplitFields && (
							<>
								<Button
									size="small"
									color="primary"
									variant="outlined"
									sx={{ mt: 2 }}
									onClick={handleSplitClick}
								>
									{"<< Regresar"}
								</Button>
								<Button
									size="small"
									color="success"
									variant="contained"
									sx={{ mt: 2 }}
									onClick={() => {
										addNewOrder('split');
									}}
								>
									Finalizar Pago
								</Button>
							</>
						)}
						<Box mt={2} sx={{ display: "flex", flexDirection: "column" }}>
							<Button
								size="small"
								color="error"
								variant="outlined"
								sx={{ mt: 2 }}
								onClick={handleClose}
							>
								Cerrar
							</Button>
						</Box>
					</Box>
				</Box>
			</Modal>
		</Paper>
	);
};
