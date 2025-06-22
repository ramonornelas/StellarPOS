import { Box, Button, Modal, Paper, Typography, TextField, InputAdornment, IconButton, ToggleButton, ToggleButtonGroup, Grid } from "@mui/material";
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
import { postCreateOrder } from '../../functions/apiFunctions';
import { mapPaymentMethod, formatCurrency } from '../../functions/generalFunctions';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { PaymentItem } from "./cart-payment-item.component";
import { DataContext } from '../../dataContext';
import { featureFlags } from "../../config/featureFlags";
import CheckIcon from '@mui/icons-material/Check';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PercentIcon from '@mui/icons-material/Percent';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloseIcon from '@mui/icons-material/Close';

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
    const [receivedAmountFocused, setReceivedAmountFocused] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const { fetchData } = useContext(DataContext);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const receivedAmountRef = React.useRef<HTMLInputElement | null>(null);
    const setReceivedAmountRef = (node: HTMLInputElement | null) => {
        receivedAmountRef.current = node;
    };
    const customDiscountRef = React.useRef<HTMLInputElement | null>(null);
    const [highlightedButton, setHighlightedButton] = useState<string | null>(null);
    const [highlightedFinalizar, setHighlightedFinalizar] = useState(false);

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

    useEffect(() => {
        if (showCustomDiscount) {
            setTimeout(() => {
                customDiscountRef.current?.focus();
            }, 100);
        }
    }, [showCustomDiscount]);

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
        addNewSplitPayment(paymentMethod);
    };

    // Helper function to determine unified payment method for split payments
    const getUnifiedSplitPaymentMethod = () => {
        if (!splitPayments || splitPayments.length === 0) return null;
        const firstMethod = splitPayments[0].payment_method;
        const allSame = splitPayments.every(p => p.payment_method === firstMethod);
        return allSame ? firstMethod : 'split';
    };

    const addNewOrder = async (paymentMethod: string) => {

        if (paymentMethod === 'split') {
            const { remainingAmount, totalToPay } = calculateRemainingAmount();

            // Check if there is a cash refund and the remaining is greater than 0
            if (remainingAmount > 0 && splitPayments.some(payment => payment.amount < 0)) {
                const updatedSplitPayments = splitPayments.filter(payment => payment.amount >= 0);
                setSplitPayments(updatedSplitPayments);

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
            let finalPaymentMethod = paymentMethod;
            if (paymentMethod === 'split') {
                orderReceivedAmount = splitPayments.reduce((acc, payment) => acc + payment.amount, 0);
                const { totalToPay } = calculateRemainingAmount();
                orderChangeAmount = orderReceivedAmount > totalToPay
                    ? parseFloat((orderReceivedAmount - totalToPay).toFixed(2))
                    : 0;

                // Determine if all split payments are the same method
                const unifiedMethod = getUnifiedSplitPaymentMethod();
                if (unifiedMethod && unifiedMethod !== 'split') {
                    finalPaymentMethod = unifiedMethod;
                }
            }

            const newOrderTicket = {
                date: selectedDate ? selectedDate.toLocaleDateString('en-CA') : new Date().toISOString().slice(0, 10),
                ticket: newOrderId,
                subtotal: total,
                payment_method: finalPaymentMethod,
                products: productsInCart,
                split_payments: (paymentMethod === 'split' && splitPayments.length > 0) ? splitPayments : [],
                discount: discount,
                tip: tipAmount,
                received_amount: orderReceivedAmount,
                change: orderChangeAmount,
                notes: notes,
                cash_register_id: sessionStorage.getItem("cashRegisterId") || ""
            };

            handlePostOrder();

            async function handlePostOrder() {
                const result = await postCreateOrder(newOrderTicket);
                if (result) {
                    openSnackBarOrderRegistered(newOrderTicket.ticket);
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
        const { remainingAmount } = calculateRemainingAmount();
        setChangeAmount(calculateChange(receivedAmount, remainingAmount));
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
        // If the last discount was custom, show the text field with the previous value
        if (!showDiscount && discountPercentage === "custom") {
            setShowCustomDiscount(true);
            setTimeout(() => {
                customDiscountRef.current?.focus();
            }, 100);
        } else if (!showDiscount) {
            setShowCustomDiscount(false);
        }
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
    const addNewSplitPayment = (paymentMethod: string) => {
        let amount = receivedAmount;
        if (receivedAmountRef.current) {
            const value = receivedAmountRef.current.value;
            amount = value === '' ? null : parseFloat(parseFloat(value).toFixed(2));
        }
        if (typeof amount === 'number' && !Number.isNaN(amount)) {
            if (amount <= 0) {
                alert('El pago debe ser mayor a $0.00');
                return;
            }
            const newId = splitPayments.length > 0 ? splitPayments[splitPayments.length - 1].id + 1 : 1;
            const splitPayment = {
                id: newId,
                amount: amount,
                payment_method: paymentMethod,
            };
            setSplitPayments([...splitPayments, splitPayment]);
            setReceivedAmount(null);
            if (receivedAmountRef.current) {
                receivedAmountRef.current.value = '';
            }
            setShowCustomTip(false);
            openSnackBarSplitPaymentRegistered(amount, mapPaymentMethod(paymentMethod));

            setTimeout(() => {
                const { remainingAmount } = calculateRemainingAmount();
                if (remainingAmount > 0 && receivedAmountRef.current) {
                    receivedAmountRef.current.focus();
                }
            }, 100);
        } else {
            alert('Debe ingresar un monto válido para el pago.');
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
            // Do not hide the buttons here
        } else {
            setShowCustomDiscount(false);
            const discount = total * percentage;
            addDiscountToOrder(discount);
            setShowDiscount(false); // Hide the buttons only if NOT custom
        }
        setDiscountPercentage(percentage);
    }

    const handleCustomDiscount = () => {
        addDiscountToOrder(0);
        setShowCustomDiscount(true);
    };

    const handleCustomDiscountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value === '') {
            setCustomDiscountError(false);
            setDiscount(0);
            setTotalWithDiscount(total);
            return;
        }
        const parsed = parseFloat(value);
        if (isNaN(parsed) || parsed < 0 || parsed > total) {
            setCustomDiscountError(true);
        } else {
            setCustomDiscountError(false);
            addDiscountToOrder(parseFloat(parsed.toFixed(2)));
        }
    };

    //Notes functions
    const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNotes(event.target.value);
    };

    //Initial state for the modal
    const modalInitialState = () => {
        // Split payments
        setShowSplitDetails(false);
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
    const canAddMorePayments = remainingAmount > 0;

    // Handles Enter to finish payment
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "Enter" &&
                !isButtonDisabled &&
                remainingAmount <= 0
            ) {
                e.preventDefault();
                setHighlightedFinalizar(true);
                setTimeout(() => setHighlightedFinalizar(false), 200);
                addNewOrder('split');
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isButtonDisabled, remainingAmount, open]);

    useEffect(() => {
        if (open && !showDiscount && canAddMorePayments) {
            setTimeout(() => {
                if (receivedAmountRef.current) {
                    receivedAmountRef.current.focus();
                }
            }, 100);
        }
    }, [showDiscount, open, canAddMorePayments]);

    useEffect(() => {
        if (showSplitDetails && totalSplitPayments === 0) {
            setTimeout(() => {
                if (receivedAmountRef.current) {
                    receivedAmountRef.current.focus();
                }
            }, 100);
        }
    }, [showSplitDetails, totalSplitPayments]);

    return (
        <Paper className={classes["container-total"]} elevation={5} square>
            <Typography variant="body1" component="h2" className={classes["total-font"]}>
                Subtotal: {formatCurrency(total)}
            </Typography>
            {enableCartButton()}
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box className={classes["modal-style"]} sx={{ position: 'relative' }}>
                    <IconButton
                        aria-label="Cerrar"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10,
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography id="modal-modal-title" variant="h5">
                        <strong>Pagar</strong>
                    </Typography>
                    <Typography
                        id="modal-modal-title"
                        variant="body2"
                        sx={{ fontSize: '1.1rem' }}
                    >
                        {'Subtotal'}: {formatCurrency(total)}
                    </Typography>
                    <Box sx={{ mt: 2 }} />
                    <Grid container spacing={3}>
                        {/* Left column */}
                        <Grid item xs={12} md={6}>
                            {featureFlags.cartModalShowTip && (
                                <>
                                    <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
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
                                </>
                            )}
                            {featureFlags.cartModalShowNotes && (
                                <>
                                    <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
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
                                </>
                            )}
                            <Box sx={{ mt: 2 }}>
                                <TextField
                                    id="receivedAmountField"
                                    inputRef={setReceivedAmountRef}
                                    required
                                    size="small"
                                    onChange={handleReceivedAmountChange}
                                    label="Monto recibido"
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                        inputProps: { min: 0, step: "any", className: classes["no-spinner"], style: { fontSize: 28, height: 48 } },
                                    }}
                                    variant="standard"
                                    margin="dense"
                                    type="number"
                                    helperText={
                                        showDiscount
                                            ? ""
                                            : "Ingrese el monto a agregar"
                                    }
                                    value={receivedAmount ?? ""}
                                    disabled={!canAddMorePayments || showDiscount}
                                    onFocus={() => setReceivedAmountFocused(true)}
                                    onBlur={() => setReceivedAmountFocused(false)}
                                    onKeyDown={(e) => {
                                        const key = e.key.toLowerCase();
                                        let method: string | null = null;
                                        if (key === 'e') method = 'cash';
                                        if (key === 't') method = 'card';
                                        if (key === 'r') method = 'transfer';
                                        if (method) {
                                            e.preventDefault();
                                            setHighlightedButton(method);
                                            handleButtonClick(method);
                                            setTimeout(() => setHighlightedButton(null), 200);
                                        }
                                    }}
                                    sx={{
                                        width: 170,
                                        fontSize: 28,
                                        height: 56,
                                        mt: 1,
                                        mb: 4,
                                        '.MuiInputBase-input': {
                                            fontSize: 28,
                                            height: 48,
                                            padding: '12px 0',
                                        },
                                        '.MuiInputLabel-root': {
                                            fontSize: 20,
                                        }
                                    }}
                                />
                            </Box>
                            <Box sx={{ width: "100%", mt: 4 }}>
                                <Grid container spacing={2} justifyContent="center">
                                    <Grid item xs={12} sm={4} sx={{ textAlign: "center" }}>
                                        <Button
                                            fullWidth
                                            size="large"
                                            color="success"
                                            variant="outlined"
                                            onClick={() => handleButtonClick('cash')}
                                            disabled={!canAddMorePayments || isButtonDisabled || showDiscount}
                                            sx={{
                                                minHeight: 64,
                                                flexDirection: "column",
                                                py: 2,
                                                bgcolor: highlightedButton === 'cash' ? 'success.light' : undefined,
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <AttachMoneyIcon sx={{ fontSize: 36 }} />
                                                {receivedAmountFocused && (
                                                    <Typography variant="caption" color="text.secondary">(E)</Typography>
                                                )}
                                            </Box>
                                        </Button>
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            sx={{ mt: 1 }}
                                            color={!canAddMorePayments || isButtonDisabled || showDiscount ? "text.disabled" : "text.primary"}
                                        >
                                            Efectivo
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4} sx={{ textAlign: "center" }}>
                                        <Button
                                            fullWidth
                                            size="large"
                                            color="success"
                                            variant="outlined"
                                            onClick={() => handleButtonClick('card')}
                                            disabled={!canAddMorePayments || isButtonDisabled || showDiscount}
                                            sx={{
                                                minHeight: 64,
                                                flexDirection: "column",
                                                py: 2,
                                                bgcolor: highlightedButton === 'card' ? 'success.light' : undefined,
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <CreditCardIcon sx={{ fontSize: 36 }} />
                                                {receivedAmountFocused && (
                                                    <Typography variant="caption" color="text.secondary">(T)</Typography>
                                                )}
                                            </Box>
                                        </Button>
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            sx={{ mt: 1 }}
                                            color={!canAddMorePayments || isButtonDisabled || showDiscount ? "text.disabled" : "text.primary"}
                                        >
                                            Tarjeta
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4} sx={{ textAlign: "center" }}>
                                        <Button
                                            fullWidth
                                            size="large"
                                            color="success"
                                            variant="outlined"
                                            onClick={() => handleButtonClick('transfer')}
                                            disabled={!canAddMorePayments || isButtonDisabled || showDiscount}
                                            sx={{
                                                minHeight: 64,
                                                flexDirection: "column",
                                                py: 2,
                                                bgcolor: highlightedButton === 'transfer' ? 'success.light' : undefined,
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <AccountBalanceIcon sx={{ fontSize: 36 }} />
                                                {receivedAmountFocused && (
                                                    <Typography variant="caption" color="text.secondary">(R)</Typography>
                                                )}
                                            </Box>
                                        </Button>
                                        <Typography
                                            variant="caption"
                                            display="block"
                                            sx={{ mt: 1 }}
                                            color={!canAddMorePayments || isButtonDisabled || showDiscount ? "text.disabled" : "text.primary"}
                                        >
                                            Transferencia
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                            {/* === End of payment buttons === */}
                            {/* ...rest of the left column... */}
                        </Grid>
                        {/* Right column */}
                        <Grid item xs={12} md={6}>
                            {/* --- Discount button --- */}
                            <Box display="flex" alignItems="center" sx={{ width: "100%", mt: 2 }}>
                                <IconButton onClick={handleToggleDiscount}>
                                    {showDiscount ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    fullWidth
                                    onClick={handleToggleDiscount}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 400,
                                        ml: 1,
                                        fontSize: "0.95rem",
                                        py: 0.5
                                    }}
                                    startIcon={<PercentIcon />}
                                >
                                    Descuento: {formatCurrency(discount)}
                                    {typeof discountPercentage === "number" && discountPercentage > 0 && (
                                        <> ({Math.round(discountPercentage * 100)}%)</>
                                    )}
                                </Button>
                            </Box>
                            {showDiscount && (
                                <>
                                    <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", mt: 1.5 }}>
                                        <ToggleButtonGroup
                                            className={classes["toggle-button-group"]}
                                            color="primary"
                                            value={discountPercentage}
                                            exclusive
                                            onChange={(_, newDiscount) => {
                                                handleDiscountPercentage(newDiscount);
                                                if (newDiscount !== "custom") setShowDiscount(false);
                                            }}
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
                                    </Box>
                                    {showCustomDiscount && (
                                        <Box sx={{ mt: 1 }}>
                                            <TextField
                                                id="custom-discount"
                                                label="Descuento personalizado"
                                                type="number"
                                                error={customDiscountError}
                                                helperText={customDiscountError ? "Valor inválido" : ""}
                                                onChange={handleCustomDiscountChange}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.stopPropagation();
                                                        setCustomDiscountError(false);
                                                        setShowCustomDiscount(false);
                                                        setShowDiscount(false);
                                                    }
                                                }}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                aria-label="Accept discount"
                                                                onClick={() => {
                                                                    setCustomDiscountError(false);
                                                                    setShowCustomDiscount(false);
                                                                    setShowDiscount(false);
                                                                }}
                                                                edge="end"
                                                            >
                                                                <CheckIcon />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                    inputProps: { min: 0, step: "any", className: classes["no-spinner"] },
                                                }}
                                                variant="outlined"
                                                size="small"
                                                inputRef={customDiscountRef}
                                                value={discount > 0 ? discount : ""}
                                            />
                                        </Box>
                                    )}
                                </>
                            )}
                            <Box display="flex" alignItems="center" sx={{ width: "100%", mt: 2 }}>
                                <IconButton onClick={handleToggleSplitDetails}>
                                    {showSplitDetails ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    fullWidth
                                    onClick={handleToggleSplitDetails}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 400,
                                        ml: 1,
                                        fontSize: "0.95rem",
                                        py: 0.5
                                    }}
                                    startIcon={<PaymentsIcon />}
                                >
                                    Pagos: {formatCurrency(totalSplitPayments)}
                                </Button>
                            </Box>
                            {showSplitDetails && (
                                <Box sx={{ mt: 2, display: "flex", flexDirection: "column" }}>
                                    {totalSplitPayments > 0 ? (
                                        <Table
                                            aria-label="spanning table"
                                            sx={{
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                boxShadow: 2,
                                                background: "#fff",
                                                minWidth: 220,
                                                mb: 2,
                                                fontSize: 13,
                                                '& .MuiTableCell-root': {
                                                    fontSize: 13,
                                                    py: 0.5,
                                                    px: 1,
                                                },
                                            }}
                                        >
                                            <TableHead>
                                                <TableRow className={classes["table-header"]}>
                                                    <TableCell
                                                        sx={{
                                                            fontWeight: "bold",
                                                            fontSize: 12,
                                                            background: "#f0f4f8",
                                                            color: "#1976d2",
                                                            borderBottom: "2px solid #e0e0e0",
                                                            py: 0.25,
                                                            px: 0.5,
                                                        }}
                                                    >
                                                        Importe
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            fontWeight: "bold",
                                                            fontSize: 12,
                                                            background: "#f0f4f8",
                                                            color: "#1976d2",
                                                            borderBottom: "2px solid #e0e0e0",
                                                            py: 0.25,
                                                            px: 0.5,
                                                        }}
                                                    >
                                                        Método
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{
                                                            background: "#f0f4f8",
                                                            borderBottom: "2px solid #e0e0e0",
                                                            py: 0.25,
                                                            px: 0.5,
                                                        }}
                                                    ></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {splitPayments.map((payment) => (
                                                    <PaymentItem key={payment.id} payment={payment} />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                            No hay pagos registrados aún.<br />{"<"}--- Agrega un pago para ver el detalle aquí.
                                        </Typography>
                                    )}
                                </Box>
                            )}                  </Grid>

                        <Box sx={{ display: "flex", flexDirection: "row", gap: 2, justifyContent: "center", alignItems: "stretch", width: "100%" }}>
                            <Box sx={{ flex: 1, mt: 2, mb: 1, p: 2, bgcolor: "#f5f5f5", borderRadius: 2, textAlign: "center" }}>
                                <Typography variant="subtitle1" color="text.primary">
                                    Total a pagar
                                </Typography>
                                <Typography
                                    variant="h5"
                                    color="text.primary"
                                    fontWeight="normal"
                                >
                                    {tipAmount > 0
                                        ? formatCurrency(totalWithTip)
                                        : discount > 0
                                            ? formatCurrency(totalWithDiscount)
                                            : formatCurrency(total)
                                    }
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, mt: 2, mb: 1, p: 2, bgcolor: "#f5f5f5", borderRadius: 2, textAlign: "center" }}>
                                <Typography variant="subtitle2" color="text.primary">
                                    {remainingAmount < 0
                                        ? "Devuelve este cambio al cliente"
                                        : "Restante por pagar"}
                                </Typography>
                                <Typography
                                    variant="h4"
                                    color={remainingAmount < 0 ? "info.main" : remainingAmount > 0 ? "error" : "success.main"}
                                    fontWeight={remainingAmount < 0 ? "bold" : "normal"}
                                >
                                    {formatCurrency(Math.abs(remainingAmount))}
                                </Typography>
                            </Box>
                        </Box>


                        <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", width: "100%" }}>
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                <Button
                                    size="small"
                                    color="success"
                                    variant="contained"
                                    sx={{
                                        mt: 2,
                                        boxShadow: highlightedFinalizar ? "0 0 0 4px #81c784" : undefined,
                                        transition: "box-shadow 0.2s"
                                    }}
                                    onClick={() => {
                                        addNewOrder('split');
                                    }}
                                    disabled={isButtonDisabled || remainingAmount > 0}
                                >
                                    Finalizar Pago
                                </Button>
                                {!isButtonDisabled && remainingAmount <= 0 ? (
                                    <Typography
                                        variant="caption"
                                        color="success.main"
                                        sx={{ mt: 0.5, display: "block", ml: 0, alignSelf: "flex-end" }}
                                    >
                                        Presiona <b>Enter</b> para finalizar el pago
                                    </Typography>
                                ) : (
                                    <Typography
                                        variant="caption"
                                        sx={{ mt: 0.5, display: "block", ml: 0, alignSelf: "flex-end", visibility: "hidden" }}
                                    >
                                        &nbsp;
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                    </Grid>
                </Box>
            </Modal>
        </Paper>
    );
};
