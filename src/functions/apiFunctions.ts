import axios from 'axios';
import { BASE_URL } from '../apiConfig';

export const postCreateOrder = async (newOrderTicket: any) => {
  try {
      await axios.post(`${BASE_URL}/orders`, newOrderTicket);
      return true;
  } catch (error) {
      if (axios.isAxiosError(error)) {
          console.error('Error creating order:', error.response ? error.response.data : error.message);
      } else {
          console.error('Unexpected error:', error);
      }
      alert('There was an error creating your order. Please try again.');
      return false;
  }
};

export const fetchOrders = async (date: string) => {
    try {
      const response = await fetch(`${BASE_URL}/orders/${date}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };

export const postOpenCashRegister = async (cashRegisterCut: any) => {
  try {
      const response = await axios.post(`${BASE_URL}/cash_register/open`, cashRegisterCut);
      return response.data;
  } catch (error) {
      if (axios.isAxiosError(error)) {
          console.error('Error opening cash register:', error.response ? error.response.data : error.message);
      } else {
          console.error('Unexpected error:', error);
      }
      return false;
  }
};

export const putCloseCashRegister = async (cashRegisterCut: any) => {
  try {
      const response = await axios.put(`${BASE_URL}/cash_register/close`, cashRegisterCut);
      return response.data;
  } catch (error) {
      if (axios.isAxiosError(error)) {
          console.error('Error closing cash register:', error.response ? error.response.data : error.message);
      } else {
          console.error('Unexpected error:', error);
      }
      return false;
  }
};

export const fetchOrderTotalsByDate = async (date: string) => {
  try {
    const response = await fetch(`${BASE_URL}/orders/totals/${date}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order totals:', error);
    return null;
  }
};

export const fetchOrderTotalsByCashRegister = async (cashRegisterId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/orders/totals/cash_register/${cashRegisterId}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order totals by cash register:', error);
    return null;
  }
};

export const fetchCashRegisterHistory = async (date?: string, limit?: number) => {
  try {
    let url = `${BASE_URL}/cash_register/history`;
    
    // Build URL based on parameters
    if (date) {
      url += `/${date}`;
    }
    
    // Add query parameters if limit is specified
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching cash register history:', error);
    return [];
  }
};

export const getCashRegister = async (cashRegisterId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/cash_register/${cashRegisterId}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching cash register closeout:', error);
    return null;
  }
};

export const getOpenCashRegister = async () => {
  try {
    const response = await fetch(`${BASE_URL}/cash_register/open`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching open cash register:', error);
    return null;
  }
};