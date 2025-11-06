import { Product } from "../products/products.model";

export interface Order {
  id: string;
  products: Product[];
  total: number;
  date: string;
  datetime?: string; // Enhanced datetime information from API
  created_datetime?: string; // Alternative datetime field
  payment_method: string;
  ticket: string;
  splitPayments?: SplitPayment[];
  notes?: string;
  discount: number;
  tip: number;
  total_with_tip: number;
  subtotal: number;
  received_amount: number;
  change: number;
  cash_register_id: string;
}

export interface ProductOrder {
  id: string; // Unique identifier for the product order
  product_id: string; // ID of the product
  product_variant_id: string; // ID of the product variant
  product_name: string; // Name of the product
  product_category: string; // Category of the product
  product_price: string; // Price of the product
  quantity: string; // Quantity of the product ordered
  total: string; // Total price for the product (quantity * price)
  created_datetime: string; // Datetime when the product order was created
  updated_datetime: string; // Datetime when the product order was last updated
  updated_user_id: string; // ID of the user who last updated the product order
  orderTicket_id: string; // ID of the order ticket associated with the product order
  // Additional computed properties for UI compatibility
  name: string; // Computed from product_name
  price: number; // Computed from total as number
}

export interface SplitPayment {
  id: string;
  orderTicket_id: string;
  payment_method: string;
  amount: string | number; // Amount paid using this method (can be string from API or number for calculations)
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
