import { BASE_URL } from '../../apiConfig';

export const fetchUserPermissions = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/permissions/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
};