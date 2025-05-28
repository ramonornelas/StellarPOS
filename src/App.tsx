import React, { useEffect, useState } from "react";
import "./App.css";
import { Home } from "./pages/home";
import { Navbar } from "./components/navbar/navbar.component";
import { Product } from "./components/products/products.model";
import { Route, Routes, useNavigate } from "react-router-dom";
import { CartPage } from "./pages/cart";
import { appContext } from "./appContext";
import { Orders } from "./pages/orders";
import { NotFoundPage } from "./pages/notFoundPage";
import { Order } from "./components/orders/order.model";
import { DataProvider } from "./dataContext";
import { DatePickerPage } from "./pages/datePickerPage";
import Login from "./components/login/Login";
import Register from "./components/register/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { ChatPage } from "./pages/chatPage";
import { CashRegister } from "./pages/cashRegister.tsx";
import { CashRegisterHistoryPage } from "./pages/cashRegisterHistoryPage.tsx";

function App() {
    const [productsInCart, setProductsInCart] = React.useState<Product[]>(
        window.sessionStorage.getItem("cart")
            ? JSON.parse(window.sessionStorage.getItem("cart")!)
            : []
    );
    const [orders, setOrders] = React.useState<Order[]>(
        window.localStorage.getItem("orders")
            ? JSON.parse(window.localStorage.getItem("orders")!)
            : []
    );
    const [splitPayments, setSplitPayments] = React.useState<any[]>(
        window.sessionStorage.getItem("splitPayments")
            ? JSON.parse(window.sessionStorage.getItem("splitPayments")!)
            : []
    );
    const [filter, setFilter] = React.useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
        !!sessionStorage.getItem("stellar_userid")
    );

    const applyFilter = (category: string) => {
        setFilter(category);
    };

    useEffect(() => {
        window.sessionStorage.setItem("cart", JSON.stringify(productsInCart));
    }, [productsInCart]);

    useEffect(() => {
        window.localStorage.setItem("orders", JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        window.sessionStorage.setItem("splitPayments", JSON.stringify(splitPayments));
    }, [splitPayments]);

    // Check login status on component mount
    useEffect(() => {
        setIsLoggedIn(!!sessionStorage.getItem("stellar_userid"));
    }, []);

    // Callback to handle successful login
    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
    };

    const navigate = useNavigate();

    const handleLogoff = () => {
        setIsLoggedIn(false); // Update the state
        sessionStorage.clear(); // Clear session storage
        navigate("/"); // Explicitly navigate to the root route
    };

    return (
        <>
            {isLoggedIn ? (
                <DataProvider>
                    <appContext.Provider
                        value={{
                            cartCTX: { productsInCart, setProductsInCart },
                            orderCTX: { orders, setOrders },
                            dateCTX: { selectedDate, setSelectedDate },
                            paymentCTX: { splitPayments, setSplitPayments },
                        }}
                    >
                        <Navbar applyFilter={applyFilter} onLogoff={handleLogoff} />
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <Home filter={filter} />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/orders"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <Orders />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/cart"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <CartPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/date-picker"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <DatePickerPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/chat"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <ChatPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/cash-register"
                                element={
                                    <ProtectedRoute isLoggedIn={isLoggedIn}>
                                        <CashRegister />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/cash-register-history" element={<CashRegisterHistoryPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </appContext.Provider>
                </DataProvider>
            ) : (
                <Routes>
                    <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                    <Route path="/registeruser" element={<Register />} />
                    <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                </Routes>
            )}
        </>
    );
}

export default App;
