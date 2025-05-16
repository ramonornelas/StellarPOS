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
	const [changeAmount, setChangeAmount] = useState<number>(0);
	const [showCustomTip, setShowCustomTip] = useState(false);
	const [customTipError, setCustomTipError] = useState<boolean>(false);
	const [showNotes, setShowNotes] = useState(false);
	const [notes, setNotes] = useState<string>("");
	const [receivedAmount, setReceivedAmount] = useState<number | null>(null);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);
	const { fetchData } = useContext(DataContext);
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);

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

	useEffect(() => {
		// Recalculate change amount when discount, tip, or received amount changes
		updateChangeAmount(receivedAmount);
	}, [discount, tipAmount, receivedAmount]);

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
	const handleButtonClick = (paymentMethod: string) => {
		if (showSplitFields) {
			addNewSplitPayment(paymentMethod);
		} else {
			addNewOrder(paymentMethod);
		}
	};

	const addNewOrder = async (paymentMethod: string) => {
		//let transactionChangeAmount = 0;

		const { totalToPay } = calculateRemainingAmount();

		// Validación de monto recibido
		if (!showSplitFields) {
			// Pago normal
			if (receivedAmount === null || receivedAmount < totalToPay) {
				alert('El monto recibido debe ser mayor o igual al total a pagar.');
				return;
			}
		}

		if (paymentMethod === 'split') {
			const { remainingAmount, totalToPay } = calculateRemainingAmount();

			// Verificar si hay devolución en efectivo y el restante es mayor a 0
			if (remainingAmount > 0 && splitPayments.some(payment => payment.amount < 0)) {
				// Eliminar devoluciones en efectivo
				const updatedSplitPayments = splitPayments.filter(payment => payment.amount >= 0);
				setSplitPayments(updatedSplitPayments);

				// Mensaje de alerta con el total a pagar y pagos realizados
				let messageCurrentDetails = `El total a pagar es de: ${formatCurrency(totalToPay)}. \nSe han pagado: ${formatCurrency(totalSplitPayments)}.`;
				let messageRequestToUser = `Se ha eliminado el Cambio Efectivo. \nConfirma la información antes de finalizar el pago.`;
				let message = `${messageCurrentDetails} \n\n${messageRequestToUser}`;

				alert(message);

				return;
			}


			if (remainingAmount > 0) {
				alert('No se puede finalizar el pago. Aún resta ' + formatCurrency(remainingAmount) + ' por pagar.');
				return;
			}
		} else {
			if (showCustomTip && tipAmount === 0) {
				setCustomTipError(true);
				return;
			}
		}

		setIsButtonDisabled(true);
		const dateString = selectedDate ? selectedDate.toLocaleDateString('en-CA') : "2024-12-31";
		getLastOrderId(dateString).then(lastOrderId => {
			const newOrderId = generateNewOrderId(lastOrderId);

			// Calculate receivedAmount and changeAmount for split payments
			let orderReceivedAmount = receivedAmount;
			let orderChangeAmount = changeAmount;
			if (paymentMethod === 'split') {
				orderReceivedAmount = splitPayments.reduce((acc, payment) => acc + payment.amount, 0);
				// Use the same logic as calculateChange for split
				const { totalToPay } = calculateRemainingAmount();
				orderChangeAmount = orderReceivedAmount > totalToPay
					? parseFloat((orderReceivedAmount - totalToPay).toFixed(2))
					: 0;
			}

			const newOrderTicket = {
				date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : new Date().toISOString().slice(0, 10),
				ticket: newOrderId,
				subtotal: total,
				payment_method: paymentMethod,
				products: productsInCart,
				split_payments: (paymentMethod === 'split' && splitPayments.length > 0) ? splitPayments : [],
				discount: discount,
				tip: tipAmount,
				received_amount: orderReceivedAmount,
				change: orderChangeAmount,
				notes: notes,
			};

			handlePostOrder();

			async function handlePostOrder() {
				const result = await postOrderToApi(newOrderTicket);
				if (result) {
					setShowSplitFields(false);
					openSnackBarOrderRegistered(newOrderTicket.ticket);
					// Actualizar el estado local después de registrar el pedido
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
		const totalSplitPayments = parseFloat(splitPayments.reduce((acc, payment) => acc + payment.amount, 0).toFixed(2));
		let totalToPay, remainingAmount = 0;

		if (tipAmount > 0) {
			totalToPay = parseFloat(totalWithTip.toFixed(2));
		} else if (discount > 0) {
			totalToPay = parseFloat(totalWithDiscount.toFixed(2));
		} else {
			totalToPay = parseFloat(total.toFixed(2));
		}

		remainingAmount = parseFloat((totalToPay - totalSplitPayments).toFixed(2));
		return { totalSplitPayments, remainingAmount, totalToPay };
	};

	const handleReceivedAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		if (value === '') {
			setReceivedAmount(null);
			updateChangeAmount(null);
		} else {
			const amount = parseFloat(parseFloat(value).toFixed(2));
			setReceivedAmount(amount);
			updateChangeAmount(amount);
		}
	};

	const calculateChange = (receivedAmount: number | null, remainingAmount: number): number => {
		if (receivedAmount === null) return 0;
		return receivedAmount > remainingAmount
			? parseFloat((receivedAmount - remainingAmount).toFixed(2))
			: 0;
	};

	const updateChangeAmount = (receivedAmount: number | null) => {
		const { totalToPay, remainingAmount } = calculateRemainingAmount();
		if (showSplitFields) {
			setChangeAmount(calculateChange(receivedAmount, remainingAmount));
		} else {
			setChangeAmount(calculateChange(receivedAmount, totalToPay));
		}
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

	const addNewSplitPayment = (paymentMethod: string) => {
		if (typeof receivedAmount === 'number' && !Number.isNaN(receivedAmount)) {
			if (receivedAmount <= 0) {
				alert('El pago debe ser mayor a $0.00');
				return;
			}
			const newId = splitPayments.length > 0 ? splitPayments[splitPayments.length - 1].id + 1 : 1;
			const splitPayment = {
				id: newId,
				amount: receivedAmount,
				payment_method: paymentMethod,
			};
			setSplitPayments([...splitPayments, splitPayment]);
			setReceivedAmount(null);
			const receivedAmountField = document.getElementById('receivedAmountField') as HTMLInputElement;
			if (receivedAmountField) {
				receivedAmountField.value = '';
			}
			setShowCustomTip(false);
			openSnackBarSplitPaymentRegistered(receivedAmount, mapPaymentMethod(paymentMethod));
		} else {
			// Puedes mostrar un error si lo deseas
		}
	};

	//Tip functions
	const addTipToOrder = (tipAmount: number) => {
		setTipAmount(parseFloat(tipAmount.toFixed(2)));
		const totalWithTip = parseFloat((totalWithDiscount + tipAmount).toFixed(2));
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
		if (event.target.value !== '') {
			tipAmount = parseFloat(parseFloat(event.target.value).toFixed(2));
		}
		addTipToOrder(tipAmount);
	};

	const handleCustomTip = () => {
		addTipToOrder(0);
		setShowCustomTip(true);
	};

	//Discount functions
	const addDiscountToOrder = (discount: number) => {
		setDiscount(parseFloat(discount.toFixed(2)));
		const totalWithDiscount = parseFloat((total - discount).toFixed(2));
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
			addDiscountToOrder(parseFloat(value.toFixed(2)));
		}
	};

	//Notes functions
	const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setNotes(event.target.value);
	};

	//Initial state for the modal
	const modalInitialState = () => {
		// Split payments
		if (splitPayments.length === 0) {
			setShowSplitFields(false);
			setShowSplitDetails(false);
		} else {
			setShowSplitFields(true);
			setShowSplitDetails(true);
		}
		//Tip
		setTipAmount(0);
		setTipPercentage(0);
		setReceivedAmount(null);
		setChangeAmount(0);
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
		//Buttons
		setIsButtonDisabled(false);
	}

	const { totalSplitPayments, remainingAmount } = calculateRemainingAmount();
	const canAddMorePayments = showSplitFields && remainingAmount > 0;

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
						<strong>Pagar</strong>
					</Typography>
					<Box sx={{ mt: 2 }} />
					<Typography id="modal-modal-title" variant="h5">
						{(discount > 0) ? 'Subtotal' : 'Total'}: {formatCurrency(total)}
					</Typography>
					{showSplitFields && (
						<Typography id="modal-modal-title" variant="body1" component="h3">
							{remainingAmount < 0
								? `Cambio: ${formatCurrency(Math.abs(remainingAmount))}`
								: `Restante: ${formatCurrency(remainingAmount)}`}
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
										Descuento 🙂: -{formatCurrency(discount)} = {formatCurrency(totalWithDiscount)}
									</div>
								) : (
									<div>
										Descuento 🙂
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
								style={{ margin: '8px 0' }}
								value={notes}
							/>
						)}
						{(!showSplitFields || canAddMorePayments) && (
							<Box sx={{ mt: 1 }}>
								<TextField
									id="receivedAmountField"
									required
									size="small"
									onChange={handleReceivedAmountChange}
									label="Monto recibido"
									InputProps={{
										startAdornment: <InputAdornment position="start">$</InputAdornment>,
										inputProps: { min: 0, step: "any" },
									}}
									variant="standard"
									margin="dense"
									type="number"
									helperText={showSplitFields ? "Ingrese el monto a agregar" : "Ingrese el monto recibido del cliente"}
									value={receivedAmount ?? ""}
									disabled={(showSplitFields && !canAddMorePayments)}
								/>
							</Box>
						)}
						{changeAmount > 0 && (
							<Box sx={{ mt: 2 }}>
								<Typography variant="body1" component="h3">
									Cambio: {formatCurrency(changeAmount)}
								</Typography>
							</Box>
						)}
						{!showSplitFields && (
							<Button
								size="small"
								color="primary"
								variant="outlined"
								sx={{ mt: 2 }}
								onClick={handleSplitClick}
							>
								{"Dividir pago >>"}
							</Button>
						)}
						{(!showSplitFields || canAddMorePayments) && (
							<Button
								size="small"
								color="success"
								variant={showSplitFields ? "outlined" : "contained"}
								sx={{ mt: 2 }}
								onClick={() => handleButtonClick('cash')}
								disabled={isButtonDisabled}
							>
								{showSplitFields ? "Agregar importe en efectivo" : "Finalizar pago en efectivo"}
							</Button>
						)}
						{(!showSplitFields || canAddMorePayments) && (
							<Button
								size="small"
								color="success"
								variant={showSplitFields ? "outlined" : "contained"}
								sx={{ mt: 2 }}
								onClick={() => handleButtonClick('card')}
								disabled={isButtonDisabled}
							>
								{showSplitFields ? "Agregar importe en tarjeta" : "Finalizar pago en tarjeta"}
							</Button>
						)}
						{(!showSplitFields || canAddMorePayments) && (
							<Button
								size="small"
								color="success"
								variant={showSplitFields ? "outlined" : "contained"}
								sx={{ mt: 2 }}
								onClick={() => handleButtonClick('transfer')}
								disabled={isButtonDisabled}
							>
								{showSplitFields ? "Agregar importe en transferencia" : "Finalizar pago en transferencia"}
							</Button>
						)}
						{showSplitFields && (
							<>
								{splitPayments.length === 0 && (
									<Button
										size="small"
										color="primary"
										variant="outlined"
										sx={{ mt: 2 }}
										onClick={handleSplitClick}
									>
										{"<< Pago total"}
									</Button>
								)}
								<Button
									size="small"
									color="success"
									variant="contained"
									sx={{ mt: 2 }}
									onClick={() => {
										addNewOrder('split');
									}}
									disabled={isButtonDisabled}
								>
									Finalizar Pago
								</Button>
							</>
						)}
						<Box sx={{ display: "flex", flexDirection: "column" }}>
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
