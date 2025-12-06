import axios from "axios";
import { BASE_URL, API_STAGE } from "../apiConfig";
import { AUTH_BASE_URL } from "../apiConfig";
import { OrderTicketPayload } from "../components/cart/cart.model";

const getApiUrl = (path: string, baseUrl: string = BASE_URL) => {
  return API_STAGE === "PROD"
    ? `${baseUrl}/${path}`
    : `${baseUrl}/${API_STAGE}/${path}`;
};

// Fetch user permissions
export const fetchUserPermissions = async (userId: string) => {
  try {
    const response = await fetch(getApiUrl(`users/permissions/${userId}`));
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }
};

// Register a new user
export const registerUser = async ({
  username,
  password,
  phone_number,
  active,
  expiration_date,
}: {
  username: string;
  password: string;
  phone_number?: string;
  active: boolean;
  expiration_date: string;
}) => {
  try {
    const response = await fetch(getApiUrl("users", AUTH_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        phone_number,
        active,
        expiration_date,
      }),
    });
    return response;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

export const postLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(getApiUrl("auth/login", AUTH_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: email, password }),
    });
    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const searchUser = async (email: string) => {
  try {
    const response = await fetch(getApiUrl("users/search", AUTH_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: email }),
    });
    return response;
  } catch (error) {
    console.error("Error searching user:", error);
    throw error;
  }
};

export const postCreateOrder = async (newOrderTicket: OrderTicketPayload) => {
  try {
    await axios.post(getApiUrl("orders"), newOrderTicket);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error creating order:",
        error.response ? error.response.data : error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    alert("Hubo un error al crear tu orden. Por favor, intenta de nuevo.");
    return false;
  }
};

export const fetchOrders = async (date: string) => {
  try {
    const response = await fetch(getApiUrl(`orders/${date}`));
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

export const fetchOrdersSummary = async (date: string) => {
  try {
    const response = await fetch(getApiUrl(`orders/summary?date=${date}`));
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching orders summary:", error);
    return {
      status: "error",
      data: {
        date,
        total_amount: 0,
        total_transactions: 0,
        payment_methods: [],
      },
    };
  }
};

export const fetchReturns = async (date: string) => {
  try {
    const response = await fetch(getApiUrl(`returns/${date}`));
    if (!response.ok) {
      // 404 means no returns for this date - return empty array
      if (response.status === 404) {
        return [];
      }
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching returns:", error);
    return [];
  }
};

export const fetchReturnsSummary = async (date: string) => {
  try {
    const response = await fetch(getApiUrl(`returns/summary?date=${date}`));
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching returns summary:", error);
    return {
      status: "error",
      data: {
        date,
        total_amount: 0,
        total_transactions: 0,
        refund_methods: [],
      },
    };
  }
};

export const postOpenCashRegister = async (cashRegisterCut: any) => {
  try {
    const response = await axios.post(
      getApiUrl("cash_register/open"),
      cashRegisterCut
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error opening cash register:",
        error.response ? error.response.data : error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return false;
  }
};

export const putCloseCashRegister = async (cashRegisterCut: any) => {
  try {
    const response = await axios.put(
      getApiUrl("cash_register/close"),
      cashRegisterCut
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error closing cash register:",
        error.response ? error.response.data : error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return false;
  }
};

export const fetchOrderTotalsByDate = async (date: string) => {
  try {
    const response = await fetch(getApiUrl(`orders/totals/${date}`));
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching order totals:", error);
    return null;
  }
};

export const fetchOrderTotalsByCashRegister = async (
  cashRegisterId: string
) => {
  try {
    const response = await fetch(
      getApiUrl(`orders/totals/cash_register/${cashRegisterId}`)
    );
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching order totals by cash register:", error);
    return null;
  }
};

export const fetchCashRegisterHistory = async (
  date?: string,
  limit?: number
) => {
  try {
    let url = getApiUrl("cash_register/history");
    // Build URL based on parameters
    if (date) {
      url += `/${date}`;
    }
    // Add query parameters if limit is specified
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append("limit", limit.toString());
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching cash register history:", error);
    return [];
  }
};

export const getCashRegister = async (cashRegisterId: string) => {
  try {
    const response = await fetch(getApiUrl(`cash_register/${cashRegisterId}`));
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching cash register closeout:", error);
    return null;
  }
};

export const getOpenCashRegister = async () => {
  try {
    const response = await fetch(getApiUrl("cash_register/open"));
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Error fetching open cash register:", error);
    return null;
  }
};

// Submit product return
export const submitReturn = async (returnData: {
  order_id: string;
  cash_register_id: string;
  products: Array<{
    id: string;
    variant_id?: string;
    quantity: number;
  }>;
  refund_method: "cash" | "card" | "transfer";
  notes: string;
  user_id?: string;
}) => {
  try {
    const response = await fetch(getApiUrl("returns"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(returnData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error processing return");
    }

    return data;
  } catch (error) {
    console.error("Error submitting return:", error);
    throw error;
  }
};

// Inventory movements functions
export const fetchInventoryMovements = async (
  filters: Record<string, string | undefined> = {},
  page: number = 1,
  limit: number = 50
) => {
  const queryParams = new URLSearchParams();

  // Add pagination
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());

  // Add filters
  if (filters.movement_type) {
    queryParams.append("movement_type", filters.movement_type);
  }
  if (filters.date_from) {
    queryParams.append("date_from", filters.date_from);
  }
  if (filters.date_to) {
    queryParams.append("date_to", filters.date_to);
  }
  if (filters.user_id) {
    queryParams.append("user_id", filters.user_id);
  }
  if (filters.product_search) {
    queryParams.append(
      "product_search",
      encodeURIComponent(filters.product_search)
    );
  }
  if (filters.run_id) {
    queryParams.append("run_id", filters.run_id);
  }

  try {
    const response = await fetch(
      getApiUrl(`inventory/movements?${queryParams.toString()}`),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    throw error;
  }
};

export const fetchInventoryMovementRunDetails = async (runId: string) => {
  try {
    const response = await fetch(
      getApiUrl(`inventory/movements/run/${runId}`),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching run details:", error);
    throw error;
  }
};
