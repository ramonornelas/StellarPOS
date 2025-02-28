import React from "react";
import { Product } from "./components/products/products.model";
import { Order } from "./components/orders/order.model";
import { Payment } from "./components/cart/cart.model";

interface CartCTX {
	productsInCart: Product[];
	setProductsInCart: React.Dispatch<React.SetStateAction<Product[]>>;
}

interface OrderCTX {
	orders: Order[];
	setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

interface DateCTX {
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
}

interface PaymentCTX {
	splitPayments: Payment[];
	setSplitPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
}

interface ContextType {
	cartCTX: CartCTX;
	orderCTX: OrderCTX;
	dateCTX: DateCTX;
	paymentCTX: PaymentCTX;
}

export const appContext = React.createContext({} as ContextType);