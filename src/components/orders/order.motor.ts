import {
  Order,
  ProcessedOrder,
  GroupedProduct,
  ProductOrder,
  ProductReturnInfo,
} from "../../types/order";
import { fetchOrders } from "../../functions/apiFunctions";

// Type for orders that can be sorted (works for both Order and ProcessedOrder)
type SortableOrder = Order | ProcessedOrder;

// Extended GroupedProduct with return information
export interface ProductWithReturns extends GroupedProduct {
  is_returned: boolean;
  quantity_returned: string | number;
  returns: ProductReturnInfo[];
}

export const ordersNewDateFirst = <T extends SortableOrder>(
  orders: T[]
): T[] => {
  return orders.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
};

export const ordersById = <T extends SortableOrder>(
  orders: T[],
  order: "asc" | "desc" = "asc"
): T[] => {
  return orders.sort((a, b) => {
    if (!a.id || !b.id) {
      return 0;
    }
    const comparison = a.id.localeCompare(b.id);
    return order === "asc" ? comparison : -comparison;
  });
};

export const ordersByTicket = <T extends SortableOrder>(
  orders: T[],
  order: "asc" | "desc" = "asc"
): T[] => {
  return orders.sort((a, b) => {
    if (!a.ticket || !b.ticket) {
      return 0;
    }
    const comparison = a.ticket.localeCompare(b.ticket);
    return order === "asc" ? comparison : -comparison;
  });
};

export function priceRow(qty: number, unit: number) {
  return qty * unit;
}

export async function getLastOrderId(dateString: string): Promise<string> {
  try {
    const orders = await fetchOrders(dateString);
    if (orders.length === 0) {
      return "#0";
    }
    const lastOrder = ordersByTicket(orders, "desc")[0];
    return lastOrder.ticket;
  } catch (error) {
    console.error("getLastOrderId error", error);
    return "#0";
  }
}

export function generateNewOrderId(id: string): string {
  const idNumber = parseInt(id.slice(1));
  return `#${(idNumber + 1).toString().padStart(3, "0")}`;
}

// Helper function to normalize variant IDs consistently across components
const normalizeVariantId = (
  productId: string,
  variantId?: string | null
): string => {
  if (!variantId || variantId === "no_variant" || variantId === productId) {
    return "";
  }
  return variantId;
};

// Function to group order products correctly
export const groupOrderProducts = (
  products: ProductOrder[]
): GroupedProduct[] => {
  const productsGrouped = products.reduce((acc, product) => {
    // Normalize the variant ID for consistent grouping
    const normalizedVariantId = normalizeVariantId(
      product.product_id,
      product.product_variant_id
    );

    // Find existing grouped product by product_id and normalized variant_id
    const found = acc.find(
      (item: GroupedProduct) =>
        item.id === product.product_id &&
        item.product_variant_id === normalizedVariantId
    );

    if (found) {
      // If found, add the quantity to the existing product
      found.qty += Number(product.quantity) || 1;
    } else {
      // If not found, create a new entry
      // Calculate unit price from total/quantity if available, fallback to product_price
      const unitPrice =
        product.total && Number(product.quantity) > 0
          ? Number(product.total) / Number(product.quantity)
          : Number(product.product_price) || 0;

      const newGroupedProduct = {
        id: product.product_id,
        product_variant_id: normalizedVariantId,
        desc: product.product_name || product.name || "Producto sin nombre",
        qty: Number(product.quantity) || 1,
        unit: unitPrice,
      };

      acc.push(newGroupedProduct);
    }
    return acc;
  }, [] as GroupedProduct[]);
  return productsGrouped;
};

// Function to group order products with return information preserved
export const groupOrderProductsWithReturns = (
  products: ProductOrder[]
): ProductWithReturns[] => {
  const productsGrouped = products.reduce((acc, product) => {
    // Normalize the variant ID for consistent grouping
    const normalizedVariantId = normalizeVariantId(
      product.product_id,
      product.product_variant_id
    );

    // Find existing grouped product by product_id and normalized variant_id
    const found = acc.find(
      (item: ProductWithReturns) =>
        item.id === product.product_id &&
        item.product_variant_id === normalizedVariantId
    );

    if (found) {
      // If found, add the quantity and merge return info
      found.qty += Number(product.quantity) || 1;
      if (product.is_returned) {
        found.is_returned = true;
        found.quantity_returned =
          Number(found.quantity_returned) +
          (Number(product.quantity_returned) || 0);
        if (product.returns && product.returns.length > 0) {
          found.returns = [...found.returns, ...product.returns];
        }
      }
    } else {
      // If not found, create a new entry
      const unitPrice =
        product.total && Number(product.quantity) > 0
          ? Number(product.total) / Number(product.quantity)
          : Number(product.product_price) || 0;

      const newGroupedProduct: ProductWithReturns = {
        id: product.product_id,
        product_variant_id: normalizedVariantId,
        desc: product.product_name || product.name || "Producto sin nombre",
        qty: Number(product.quantity) || 1,
        unit: unitPrice,
        is_returned: product.is_returned || false,
        quantity_returned: product.quantity_returned || 0,
        returns: product.returns || [],
      };

      acc.push(newGroupedProduct);
    }
    return acc;
  }, [] as ProductWithReturns[]);
  return productsGrouped;
};
