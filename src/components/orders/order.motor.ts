import { Order } from "./order.model";
import { fetchOrders } from '../../functions/apiFunctions';

export const ordersNewDateFirst = (orders: Order[]) => {
	return orders.sort((a, b) => {
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});
}

export const ordersById = (orders: Order[], order: 'asc' | 'desc' = 'asc') => {
    return orders.sort((a, b) => {
        if (!a.id || !b.id) {
            return 0;
        }
        const comparison = a.id.localeCompare(b.id);
        return order === 'asc' ? comparison : -comparison;
    });
}

export const ordersByTicket = (orders: Order[], order: 'asc' | 'desc' = 'asc') => {
	return orders.sort((a, b) => {
			if (!a.ticket || !b.ticket) {
					return 0;
			}
			const comparison = a.ticket.localeCompare(b.ticket);
			return order === 'asc' ? comparison : -comparison;
	});
}

export function priceRow(qty: number, unit: number) {
	return qty * unit;
}

export async function getLastOrderId(dateString: string): Promise<string> {
  try {
		const orders = await fetchOrders(dateString);
		if (orders.length === 0) {
			return '#0';
		}
		const lastOrder = ordersByTicket(orders, 'desc')[0];
		return lastOrder.ticket;
	} catch (error) {
		console.error('getLastOrderId error', error);
		return '#0';
	}
}

export function generateNewOrderId(id: string): string {
	const idNumber = parseInt(id.slice(1));
	return `#${(idNumber + 1).toString().padStart(3, "0")}`
}