import { InventoryMovement, MovementFilters } from "./inventoryMovementsTypes";

/**
 * Format datetime string to readable format in local timezone
 */
export const formatMovementDateTime = (datetime: string): string => {
  try {
    let processedDateString = datetime;

    // Check if this is a backend datetime string (has time but no timezone info)
    const isBackendDateTime =
      datetime.includes("T") &&
      !datetime.endsWith("Z") &&
      !datetime.includes("+") &&
      !datetime.includes("-", 19); // Don't match the date separators

    if (isBackendDateTime) {
      // Backend sends UTC time as local string - append 'Z' to treat as UTC
      processedDateString = datetime.endsWith("Z")
        ? datetime
        : datetime + "Z";
    }

    const date = new Date(processedDateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string provided:", datetime);
      return datetime;
    }

    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      // timeZone se detecta automáticamente del sistema
    });
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return datetime;
  }
};

/**
 * Format quantity change with +/- sign
 */
export const formatQuantityChange = (quantity: number): string => {
  if (quantity > 0) {
    return `+${quantity}`;
  } else if (quantity < 0) {
    return quantity.toString();
  }
  return "0";
};

/**
 * Get display name for product with variant
 */
export const getProductDisplayName = (movement: InventoryMovement): string => {
  if (movement.variant_name) {
    return `${movement.product_name} - ${movement.variant_name}`;
  }
  return movement.product_name;
};

/**
 * Build query string for current filters (for URL sharing)
 */
export const buildFiltersQueryString = (
  filters: MovementFilters,
  page: number = 1
): string => {
  const params = new URLSearchParams();

  if (page > 1) params.append("page", page.toString());
  if (filters.movement_type)
    params.append("movement_type", filters.movement_type);
  if (filters.date_from) params.append("date_from", filters.date_from);
  if (filters.date_to) params.append("date_to", filters.date_to);
  if (filters.user_id) params.append("user_id", filters.user_id);
  if (filters.product_search)
    params.append("product_search", filters.product_search);
  if (filters.run_id) params.append("run_id", filters.run_id);

  return params.toString();
};

/**
 * Parse URL query parameters to filters object
 */
export const parseFiltersFromURL = (): {
  filters: MovementFilters;
  page: number;
} => {
  const urlParams = new URLSearchParams(window.location.search);

  const filters: MovementFilters = {};
  const page = parseInt(urlParams.get("page") || "1");

  const movementType = urlParams.get("movement_type");
  if (
    movementType === "addition" ||
    movementType === "adjustment" ||
    movementType === "count" ||
    movementType === "return" ||
    movementType === "sale"
  ) {
    filters.movement_type = movementType;
  }

  const dateFrom = urlParams.get("date_from");
  if (dateFrom) filters.date_from = dateFrom;

  const dateTo = urlParams.get("date_to");
  if (dateTo) filters.date_to = dateTo;

  const userId = urlParams.get("user_id");
  if (userId) filters.user_id = userId;

  const productSearch = urlParams.get("product_search");
  if (productSearch) filters.product_search = decodeURIComponent(productSearch);

  const runId = urlParams.get("run_id");
  if (runId) filters.run_id = runId;

  return { filters, page };
};

/**
 * Update URL with current filters (for bookmarking)
 */
export const updateURLWithFilters = (
  filters: MovementFilters,
  page: number = 1
): void => {
  const queryString = buildFiltersQueryString(filters, page);
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.replaceState(null, "", newUrl);
};
