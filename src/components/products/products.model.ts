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
}

export interface ProductVariant {
  description: string;
  id: string;
  price: number;
  name: string;
  product_name: string;
  product_id: string;
  display_order: number;
  category_id: string;
  category_name: string;
  has_variants: boolean;
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
}

// Tipos para movimientos de inventario
export interface InventoryMovementItem {
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
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
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string;
  user_id: string;
  created_datetime: string;
  updated_datetime: string;
  run_id: string;
}

export interface InventoryMovementResponse {
  status: "success" | "error";
  applied: boolean;
  run_id: string;
  message: string;
  movements: InventoryMovement[];
}
