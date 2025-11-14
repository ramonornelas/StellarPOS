import { ComboProduct } from "../products/products.model";

export interface ProductsInCart {
  desc: string;
  qty: number;
  unit: number;
  category: string;
  id: string;
  product_variant_id: string;
  payment_method?: string;
  ticket?: string;
  display_order?: number;
  is_combo?: boolean;
}

export interface SplitPaymentPayload {
  id: number;
  amount: number;
  payment_method: string;
}

export interface Payment {
  id: number;
  amount: number;
  payment_method: string;
}

export interface OrderProductPayload {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_name: string;
  is_combo: boolean;
  combo_products?: ComboProduct[];
  product_variant_id?: string;
}

export interface OrderTicketPayload {
  date: string;
  ticket: string;
  subtotal: number;
  payment_method: string;
  products: OrderProductPayload[];
  split_payments: SplitPaymentPayload[];
  discount: number;
  tip: number;
  received_amount: number | null;
  change: number;
  notes: string;
  cash_register_id: string;
  updated_user_id: string | null;
}
