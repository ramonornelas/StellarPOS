import { useEffect, useState, useCallback } from "react";
import {
  fetchOrdersSummary,
  fetchOrders,
  fetchReturns,
  fetchReturnsSummary,
} from "../../functions/apiFunctions";
import {
  Order,
  OrderSummary,
  ProductOrder,
  SplitPayment,
  Return,
  ReturnSummary,
  ReturnProductItem,
  ProcessedOrder,
  ProcessedReturn,
} from "../../types/order";

export const useOrders = (date: string) => {
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getOrders = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    getOrders();
  }, [getOrders]);

  return { orders, loading, refetch: getOrders };
};

export const useOrdersSummary = (date: string) => {
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getSummary = useCallback(async () => {
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
  }, [date]);

  useEffect(() => {
    getSummary();
  }, [getSummary]);

  return { summary, loading, refetch: getSummary };
};

export const useReturns = (date: string) => {
  const [returns, setReturns] = useState<ProcessedReturn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getReturns = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedReturns = await fetchReturns(date);
      const processedReturns = fetchedReturns.map((returnItem: Return) => ({
        ...returnItem,
        refund_amount: returnItem.refund_amount
          ? Number(returnItem.refund_amount)
          : 0,
        products: (returnItem.products || []).map(
          (product: ReturnProductItem) => ({
            ...product,
            product_price: product.product_price
              ? Number(product.product_price)
              : 0,
            quantity: product.quantity ? Number(product.quantity) : 0,
            total: product.total ? Number(product.total) : 0,
          })
        ),
      }));
      setReturns(processedReturns);
    } catch (error) {
      console.error("Error fetching returns:", error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    getReturns();
  }, [getReturns]);

  return { returns, loading, refetch: getReturns };
};

export const useReturnsSummary = (date: string) => {
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchReturnsSummary(date);
      if (response.status === "success") {
        setSummary(response.data);
      } else {
        setSummary({
          date,
          total_amount: 0,
          total_transactions: 0,
          refund_methods: [],
        });
      }
    } catch (error) {
      console.error("Error fetching returns summary:", error);
      setSummary({
        date,
        total_amount: 0,
        total_transactions: 0,
        refund_methods: [],
      });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    getSummary();
  }, [getSummary]);

  return { summary, loading, refetch: getSummary };
};
