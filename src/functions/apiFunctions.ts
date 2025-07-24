import axios from 'axios';
import { BASE_URL, API_STAGE } from '../apiConfig';
import { AUTH_BASE_URL } from '../apiConfig';


const getApiUrl = (path: string, baseUrl: string = BASE_URL) => {
  return API_STAGE === 'PROD'
    ? `${baseUrl}/${path}`
    : `${baseUrl}/${API_STAGE}/${path}`;
};

export const postLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(getApiUrl('auth/login', AUTH_BASE_URL), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }),
    });
    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const searchUser = async (email: string) => {
  try {
    const response = await fetch(getApiUrl('users/search', AUTH_BASE_URL), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email }),
    });
    return response;
  } catch (error) {
    console.error('Error searching user:', error);
    throw error;
  }
};

export const postCreateOrder = async (newOrderTicket: any) => {
  try {
      await axios.post(getApiUrl('orders'), newOrderTicket);
      return true;
  } catch (error) {
      if (axios.isAxiosError(error)) {
          console.error('Error creating order:', error.response ? error.response.data : error.message);
      } else {
          console.error('Unexpected error:', error);
      }
      alert('Hubo un error al crear tu orden. Por favor, intenta de nuevo.');
      return false;
  }
};

export const fetchOrders = async (date: string) => {
    try {
      const response = await fetch(getApiUrl(`orders/${date}`));
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };

export const postOpenCashRegister = async (cashRegisterCut: any) => {
  try {
      const response = await axios.post(getApiUrl('cash_register/open'), cashRegisterCut);
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
      const response = await axios.put(getApiUrl('cash_register/close'), cashRegisterCut);
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
    const response = await fetch(getApiUrl(`orders/totals/${date}`));
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order totals:', error);
    return null;
  }
};

export const fetchOrderTotalsByCashRegister = async (cashRegisterId: string) => {
  try {
    const response = await fetch(getApiUrl(`orders/totals/cash_register/${cashRegisterId}`));
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching order totals by cash register:', error);
    return null;
  }
};

export const fetchCashRegisterHistory = async (date?: string, limit?: number) => {
  try {
    let url = getApiUrl('cash_register/history');
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
    const response = await fetch(getApiUrl(`cash_register/${cashRegisterId}`));
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching cash register closeout:', error);
    return null;
  }
};

export const getOpenCashRegister = async () => {
  try {
    const response = await fetch(getApiUrl('cash_register/open'));
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching open cash register:', error);
    return null;
  }
};