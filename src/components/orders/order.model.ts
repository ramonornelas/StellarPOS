import { Product } from "../products/products.model";
import { Payment } from "../cart/cart.model";

export interface Order {
	id: string;
	products: Product[];
	total: number;
	date: string;
	payment_method: string;
	ticket: string;
	splitPayments?: Payment[];
	notes?: string;
	discount: number;
	tip: number;
	total_with_tip: number;
	subtotal: number;
	received_amount: number;
	change: number;
	cash_register_id: string;
}

export interface OrderForOrderDetails {
	id: string;
	total: number;
	date: string;
	payment_method: string;
	ticket?: string;
}