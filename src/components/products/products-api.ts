import { BASE_URL } from '../../apiConfig';

export const fetchProducts = async () => {
  try {
    const response = await fetch(`${BASE_URL}/products`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const response = await fetch(`${BASE_URL}/categories`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const fetchProductVariants = async () => {
  try {
    const response = await fetch(`${BASE_URL}/product_variants`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return [];
  }
};