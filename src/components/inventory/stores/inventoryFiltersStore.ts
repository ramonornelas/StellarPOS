import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MovementFilters } from "../inventoryMovementsTypes";

interface InventoryFiltersState {
  // Filter values
  filters: MovementFilters;
  currentPage: number;

  // Actions
  setFilters: (filters: MovementFilters) => void;
  setCurrentPage: (page: number) => void;
  clearFilters: () => void;

  // Sync with URL
  syncFromURL: () => void;
  syncToURL: () => void;
}

// Helper to parse filters from URL
const parseFiltersFromURL = (): { filters: MovementFilters; page: number } => {
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

// Helper to build URL params from filters
const buildURLParams = (
  filters: MovementFilters,
  page: number
): URLSearchParams => {
  // Get existing URL params to preserve tab params
  const currentParams = new URLSearchParams(window.location.search);

  // Preserve tab-related params
  const tab = currentParams.get("tab");
  const inventoryTab = currentParams.get("inventoryTab");

  // Build new params
  const params = new URLSearchParams();

  // Add preserved tab params first
  if (tab) params.set("tab", tab);
  if (inventoryTab) params.set("inventoryTab", inventoryTab);

  // Add filter params
  if (page > 1) params.set("page", page.toString());
  if (filters.movement_type) params.set("movement_type", filters.movement_type);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.user_id) params.set("user_id", filters.user_id);
  if (filters.product_search)
    params.set("product_search", filters.product_search);
  if (filters.run_id) params.set("run_id", filters.run_id);

  return params;
};

export const useInventoryFiltersStore = create<InventoryFiltersState>()(
  persist(
    (set, get) => ({
      // Default values
      filters: {},
      currentPage: 1,

      // Set filters
      setFilters: (filters) => {
        set({ filters, currentPage: 1 });
        get().syncToURL();
      },

      // Set current page
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().syncToURL();
      },

      // Clear all filters
      clearFilters: () => {
        set({ filters: {}, currentPage: 1 });
        get().syncToURL();
      },

      // Read from URL params
      syncFromURL: () => {
        const { filters, page } = parseFiltersFromURL();
        set({ filters, currentPage: page });
      },

      // Write to URL params
      syncToURL: () => {
        const state = get();
        const params = buildURLParams(state.filters, state.currentPage);

        const queryString = params.toString();
        const newUrl = queryString
          ? `${window.location.pathname}?${queryString}`
          : window.location.pathname;

        window.history.replaceState(null, "", newUrl);
      },
    }),
    {
      name: "inventory-filters-storage", // localStorage key
    }
  )
);
