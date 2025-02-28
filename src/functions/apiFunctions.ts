import axios from 'axios';
import { BASE_URL } from '../apiConfig';

export const postOrderToApi = async (newOrderTicket: any) => {
  try {
      // Send a POST request to your endpoint to create the order in the database
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
      // Ensure data is an array
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };