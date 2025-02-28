import React, { useEffect, useState } from "react";
import "./App.css";
import { Home } from "./pages/home";
import { Navbar } from "./components/navbar/navbar.component";
import { Product } from "./components/products/products.model";
import { Route, Routes } from "react-router-dom";
import { CartPage } from "./pages/cart";
import { appContext } from "./appContext";
import { Orders } from "./pages/orders";
import { NotFoundPage } from "./pages/notFoundPage";
import { Order } from "./components/orders/order.model";
import { DataProvider } from "./dataContext";

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
    const [filter, setFilter] = React.useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

    return (
        <>
            <DataProvider>
                <appContext.Provider
                    value={{
                        cartCTX: { productsInCart, setProductsInCart },
                        orderCTX: { orders, setOrders },
                        dateCTX: { selectedDate, setSelectedDate },
                        paymentCTX: { splitPayments, setSplitPayments },
                    }}
                >
                    <Navbar applyFilter={applyFilter} />
                    <Routes>
                        <Route path="/" element={<Home filter={filter} />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </appContext.Provider>
            </DataProvider>
        </>
    );
}

export default App;
