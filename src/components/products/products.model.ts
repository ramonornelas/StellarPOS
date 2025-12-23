export interface Product {
  is_active: unknown;
  name: string;
  price: number;
  category_id: string;
  id: string;
  has_variants: boolean;
  image_url: string;
  category_name: string;
  description: string;
  is_combo: boolean;
  product_variant_id: string;
  display_order: number;
  quantity?: number;
  stock_available?: number;
  barcode?: string;
  variants?: ProductVariant[];
  combo_products?: ComboProduct[];
}

export interface ComboProduct {
  product_id: string;
  quantity_per_combo: number;
  combo_products?: ComboProduct[];
}

export interface ComboProduct {
  product_id: string;
  quantity_per_combo: number;
}

export interface ProductVariant {
  description?: string;
  id: string;
  price: number | string;
  name: string;
  product_name?: string;
  product_id: string;
  display_order: number | string;
  category_id?: string;
  category_name?: string;
  has_variants?: boolean;
  stock_available: number | string;
  active: boolean;
  updated_datetime: string;
  created_datetime: string;
  updated_user_id: string;
  is_deleted: boolean;
  barcode?: string;
}

export interface Category {
  name: string;
  id: string;
  display_order: number;
}

export interface ProductVariantModal {
  display_order: string | number;
  id: string;
  name: string;
  price: string | number;
  description: string;
  product_id: string;
  product_name: string;
  barcode?: string;
}

// Types for inventory movements
export interface InventoryMovementItem {
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  notes?: string; // Optional product-specific notes
}

export interface InventoryMovementRequest {
  movement_type: "addition" | "subtraction" | "adjustment";
  apply: boolean;
  notes: string;
  user_id: string;
  items: InventoryMovementItem[];
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  movement_type: "addition" | "adjustment" | "count";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string;
  user_id: string;
  created_datetime: string;
  updated_datetime?: string;
  run_id: string;
}

export interface InventoryMovementError {
  product_id: string;
  product_variant_id?: string | null;
  reason: string;
}

export interface InventoryMovementResponse {
  status: "success" | "error";
  applied: boolean;
  run_id: string;
  message: string;
  movements: InventoryMovement[];
  errors?: InventoryMovementError[]; // Present when status is "error"
}

// Types for phiysical count
export interface CountItem {
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
}

export interface CountValidationRequest {
  movement_type: "count";
  apply: false;
  notes: string;
  user_id: string;
  items: CountItem[];
}

export interface CountApplyRequest {
  movement_type: "count";
  apply: true;
  notes: string;
  user_id: string;
  items: CountItem[];
}

export interface CountValidationResponse {
  status: "success" | "error";
  applied: false;
  run_id: string;
  movement_type: "count";
  needs_recount: Array<{
    product_id: string;
    product_variant_id?: string | null;
    label: string;
  }>;
  message: string;
}

export interface CountApplyResponse {
  status: "success" | "error";
  applied: boolean;
  run_id: string;
  message: string;
  movements?: InventoryMovement[];
}

// Interfaz para items contables en la UI
export interface CountableItem {
  id: string; // Unique identifier for UI
  product_id: string;
  product_variant_id: string | null;
  product_name: string;
  variant_name?: string;
  display_name: string;
  is_variant: boolean;
  stock_available: number;
  counted_quantity: number | string;
  isProductHeader?: boolean; // Para marcar filas de encabezado de producto
  display_order: number; // display_order del producto padre, usado para ordenar grupos
}
