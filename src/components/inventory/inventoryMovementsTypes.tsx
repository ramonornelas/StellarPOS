export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  product_variant_id?: string | null;
  variant_name?: string | null;
  movement_type: "addition" | "adjustment" | "count" | "return" | "sale";
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string;
  user_id: string;
  user_name: string;
  created_datetime: string;
  run_id?: string | null;
  run_type?: string;
  required_recount?: boolean;
}

export interface MovementPagination {
  current_page: number;
  total_pages: number;
  total_count: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface MovementFilters {
  movement_type?: "addition" | "adjustment" | "count" | "return" | "sale";
  date_from?: string;
  date_to?: string;
  user_id?: string;
  product_search?: string;
  run_id?: string;
}

export interface MovementsResponse {
  status: string;
  data: {
    movements: InventoryMovement[];
    pagination: MovementPagination;
    filters_applied: MovementFilters;
  };
}

export interface RunInfo {
  id: string;
  created_datetime: string;
  movement_type: string;
  user_id: string;
  user_name: string;
  items_count: number;
  status: string;
  message: string;
}

export interface RunMovement {
  id: string;
  product_name: string;
  variant_name?: string | null;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  required_recount?: boolean;
  discrepancy_magnitude?: number;
}

export interface RunSummary {
  total_items_counted: number;
  items_with_discrepancies: number;
  items_requiring_recount: number;
  largest_discrepancy: number;
  total_adjustment_value: number;
}

export interface RunDetailsResponse {
  status: string;
  data: {
    run_info: RunInfo;
    movements: RunMovement[];
    summary?: RunSummary;
  };
}

export interface MovementTypeConfig {
  label: string;
  icon: string;
  color: string;
}

export const MOVEMENT_TYPE_CONFIG: Record<string, MovementTypeConfig> = {
  addition: {
    label: "Entrada",
    icon: "📦",
    color: "#4caf50",
  },
  adjustment: {
    label: "Ajuste",
    icon: "⚙️",
    color: "#ff9800",
  },
  count: {
    label: "Conteo Físico",
    icon: "📋",
    color: "#2196f3",
  },
  return: {
    label: "Devolución",
    icon: "🔄",
    color: "#f44336",
  },
  sale: {
    label: "Venta",
    icon: "💰",
    color: "#3f51b5",
  },
};
