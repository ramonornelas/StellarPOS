import { useEffect, useState } from "react";
import { fetchOrdersSummary, fetchOrders } from "../../functions/apiFunctions";
import { Order, OrderSummary, ProductOrder, SplitPayment } from "./order.model";

export const useOrders = (date: string) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const getOrders = async () => {
      const fetchedOrders = await fetchOrders(date);
      const processedOrders = fetchedOrders.map((order: Order) => ({
        ...order,
        products: order.products.map((product: ProductOrder) => ({
          ...product,
          name: product.product_name,
          price: product.total ? Number(product.total) : 0,
        })),
        splitPayments: (order.splitPayments || []).map(
          (payment: SplitPayment) => ({
            ...payment,
            amount: payment.amount ? Number(payment.amount) : 0,
          })
        ),
        total: order.total ? Number(order.total) : 0,
        discount: order.discount ? Number(order.discount) : 0,
        tip: order.tip ? Number(order.tip) : 0,
        total_with_tip: order.total_with_tip ? Number(order.total_with_tip) : 0,
        subtotal: order.subtotal ? Number(order.subtotal) : 0,
        received_amount: order.received_amount
          ? Number(order.received_amount)
          : 0,
        change: order.change ? Number(order.change) : 0,
      }));
      setOrders(processedOrders);
    };

    getOrders();
  }, [date]);

  return orders;
};

export const useOrdersSummary = (date: string) => {
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getSummary = async () => {
      setLoading(true);
      try {
        const response = await fetchOrdersSummary(date);
        if (response.status === "success") {
          setSummary(response.data);
        } else {
          setSummary({
            date,
            total_amount: 0,
            total_transactions: 0,
            payment_methods: [],
          });
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
        setSummary({
          date,
          total_amount: 0,
          total_transactions: 0,
          payment_methods: [],
        });
      } finally {
        setLoading(false);
      }
    };

    getSummary();
  }, [date]);

  return { summary, loading };
};
