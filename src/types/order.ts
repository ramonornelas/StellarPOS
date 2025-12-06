// =============================================================================
// ORDER TYPES
// =============================================================================

/**
 * Order ticket from GET /orders/{date}
 */
export interface Order {
  id: string;
  ticket: string;
  date: string;
  created_datetime: string;
  updated_datetime: string;
  payment_method: string;
  total: string;
  subtotal: string;
  discount: string;
  tip: string;
  total_with_tip: string;
  received_amount: string;
  change: string;
  notes: string;
  customer_id: string;
  cash_register_id: string;
  updated_user_id: string;
  products: ProductOrder[];
  splitPayments?: SplitPayment[];
  return_status?: "none" | "partial" | "total";
}

/**
 * Processed order for frontend use (with numeric values)
 */
export interface ProcessedOrder
  extends Omit<
    Order,
    | "total"
    | "subtotal"
    | "discount"
    | "tip"
    | "total_with_tip"
    | "received_amount"
    | "change"
    | "products"
    | "splitPayments"
  > {
  total: number;
  subtotal: number;
  discount: number;
  tip: number;
  total_with_tip: number;
  received_amount: number;
  change: number;
  products: ProcessedProductOrder[];
  splitPayments?: ProcessedSplitPayment[];
}

/**
 * Processed product for frontend use
 */
export interface ProcessedProductOrder extends ProductOrder {
  name: string;
  price: number;
}

/**
 * Processed split payment for frontend use
 */
export interface ProcessedSplitPayment extends Omit<SplitPayment, "amount"> {
  amount: number;
}

/**
 * Product within an order
 */
export interface ProductOrder {
  id: string;
  product_id: string;
  product_variant_id: string;
  product_name: string;
  product_category: string;
  product_price: string;
  quantity: string;
  total: string;
  orderTicket_id: string;
  created_datetime: string;
  updated_datetime: string;
  updated_user_id: string;
  // Return tracking fields
  is_returned: boolean;
  quantity_returned: string;
  returns: ProductReturnInfo[];
  // Computed fields (added by frontend)
  name?: string;
  price?: number;
}

/**
 * Return info for a product within an order
 */
export interface ProductReturnInfo {
  returnTicket_id: string;
  quantity: string;
  return_date: string;
  returnTicket_ticket: string;
}

/**
 * Split payment within an order
 */
export interface SplitPayment {
  id: string;
  orderTicket_id: string;
  payment_method: string;
  amount: string;
  created_datetime: string;
  updated_datetime: string;
  updated_user_id: string;
}

/**
 * Order summary from GET /orders/summary?date=
 */
export interface OrderSummary {
  date: string;
  total_amount: number;
  total_transactions: number;
  payment_methods: PaymentMethodSummary[];
}

export interface PaymentMethodSummary {
  method: string;
  method_display: string;
  total_amount: number;
  transaction_count: number;
}

// =============================================================================
// RETURN TYPES
// =============================================================================

/**
 * Return ticket from GET /returns/{date}
 */
export interface Return {
  id: string;
  ticket: string;
  date: string;
  created_datetime: string;
  updated_datetime: string;
  refund_amount: string;
  refund_method: string;
  notes: string;
  orderTicket_id: string;
  cash_register_id: string;
  updated_user_id: string;
  products: ReturnProductItem[];
}

/**
 * Product within a return ticket
 */
export interface ReturnProductItem {
  product_id: string;
  product_name: string;
  product_price: string;
  quantity: string;
  total: string;
}

/**
 * Processed return ticket for frontend use (with numeric values)
 */
export interface ProcessedReturn
  extends Omit<Return, "refund_amount" | "products"> {
  refund_amount: number;
  products: ProcessedReturnProductItem[];
}

/**
 * Processed return product item for frontend use
 */
export interface ProcessedReturnProductItem
  extends Omit<ReturnProductItem, "product_price" | "quantity" | "total"> {
  product_price: number;
  quantity: number;
  total: number;
}

/**
 * Return summary from GET /returns/summary?date=
 */
export interface ReturnSummary {
  date: string;
  total_amount: number;
  total_transactions: number;
  refund_methods: RefundMethodSummary[];
}

export interface RefundMethodSummary {
  method: string;
  method_display: string;
  total_amount: number;
  transaction_count: number;
}

// =============================================================================
// FORM/REQUEST TYPES
// =============================================================================

/**
 * Data for submitting a return (POST /returns)
 */
export interface ReturnData {
  order_id: string;
  cash_register_id: string;
  products: ReturnProduct[];
  refund_method: "cash" | "card" | "transfer";
  notes: string;
}

/**
 * Product selection in return form
 */
export interface ReturnProduct {
  id: string;
  variant_id?: string;
  quantity: number;
  name: string;
  price: number;
}

// =============================================================================
// HELPER TYPES (Frontend only)
// =============================================================================

/**
 * Grouped product for display purposes
 */
export interface GroupedProduct {
  id: string;
  product_variant_id: string;
  desc: string;
  qty: number;
  unit: number;
}

/**
 * Legacy type for order details display
 */
export interface OrderForOrderDetails {
  id: string;
  total: number;
  date: string;
  payment_method: string;
  ticket?: string;
}
