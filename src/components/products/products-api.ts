import { BASE_URL, API_STAGE } from '../../apiConfig';

const getApiUrl = (path: string, baseUrl: string = BASE_URL) => {
  return API_STAGE === 'PROD'
    ? `${baseUrl}/${path}`
    : `${baseUrl}/${API_STAGE}/${path}`;
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await fetch(getApiUrl(`products/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting product');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};
export const updateProduct = async (id: string, product: any) => {
  try {
    const response = await fetch(getApiUrl(`products/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error('Error updating product');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};
export const addProduct = async (product: any) => {
  try {
    const response = await fetch(getApiUrl('products'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error('Error adding product');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const fetchProducts = async () => {
  try {
    const response = await fetch(getApiUrl('products'));
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

export const fetchProductCombos = async () => {
  try {
    const response = await fetch(`${BASE_URL}/products/combos`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching product combos:', error);
    return [];
  }
};