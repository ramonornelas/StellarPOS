export interface Order {
  id: string;
  products: ProductOrder[];
  total: string | number;
  date: string;
  datetime?: string;
  created_datetime?: string;
  payment_method: string;
  ticket: string;
  splitPayments?: SplitPayment[];
  notes?: string;
  discount: string | number;
  tip: string | number;
  total_with_tip: string | number;
  subtotal: string | number;
  received_amount: string | number;
  change: string | number;
  cash_register_id: string;
}

export interface GroupedProduct {
  id: string;
  product_variant_id: string;
  desc: string;
  qty: number;
  unit: number;
}

export interface ProductOrder {
  id: string;
  product_id: string;
  product_variant_id: string;
  product_name: string;
  product_category: string;
  product_price: string | number;
  quantity: string | number;
  total: string | number;
  created_datetime: string;
  updated_datetime: string;
  updated_user_id: string;
  orderTicket_id: string;
  name?: string;
  price?: number;
}

export interface SplitPayment {
  id: string;
  orderTicket_id: string;
  payment_method: string;
  amount: string | number;
  created_datetime: string;
  updated_datetime: string;
  updated_user_id: string;
}

export interface OrderForOrderDetails {
  id: string;
  total: number;
  date: string;
  payment_method: string;
  ticket?: string;
}

export interface OrderSummary {
  date: string;
  total_amount: number;
  total_transactions: number;
  payment_methods: {
    method: string;
    method_display: string;
    total_amount: number;
    transaction_count: number;
  }[];
}

export interface ReturnProduct {
  id: string;
  variant_id?: string;
  quantity: number;
  name: string;
  price: number;
}

export interface ReturnData {
  order_id: string;
  cash_register_id: string;
  products: ReturnProduct[];
  refund_method: "cash" | "card" | "transfer";
  notes: string;
}
