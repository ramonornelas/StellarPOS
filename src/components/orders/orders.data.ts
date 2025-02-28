import { useEffect, useState } from 'react';
import { fetchOrders } from '../../functions/apiFunctions';

export const useOrders = (date: string) => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const getOrders = async () => {
      const fetchedOrders = await fetchOrders(date);
      const processedOrders = fetchedOrders.map((order: any) => ({
        ...order,
        products: order.products.map((product: any) => ({
          ...product,
          id: product.product_id,
          name: product.product_name,
          price: product.total ? Number(product.total) : 0
        })),
        splitPayments: order.splitPayments.map((payment: any) => ({
          ...payment,
          amount: payment.amount ? Number(payment.amount) : 0
        })),
        total: order.total ? Number(order.total) : 0
      }));
      setOrders(processedOrders);
    };

    getOrders();
  }, [date]);

  return orders;
};