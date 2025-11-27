import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MainTab = "products" | "inventory";
export type InventoryTab = "entradas" | "conteo" | "ajustes" | "historial";

interface TabState {
  // Current tab states
  mainTab: MainTab;
  inventoryTab: InventoryTab;

  // Actions
  setMainTab: (tab: MainTab) => void;
  setInventoryTab: (tab: InventoryTab) => void;

  // Sync with URL
  syncFromURL: () => void;
  syncToURL: () => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      // Default values
      mainTab: "products",
      inventoryTab: "entradas",

      // Set main tab
      setMainTab: (tab) => {
        set({ mainTab: tab });
        get().syncToURL();
      },

      // Set inventory tab
      setInventoryTab: (tab) => {
        set({ inventoryTab: tab });
        get().syncToURL();
      },

      // Read from URL params
      syncFromURL: () => {
        const params = new URLSearchParams(window.location.search);
        const mainTab = params.get("tab") as MainTab | null;
        const inventoryTab = params.get("inventoryTab") as InventoryTab | null;

        const updates: Partial<TabState> = {};

        if (mainTab === "products" || mainTab === "inventory") {
          updates.mainTab = mainTab;
        }

        if (
          inventoryTab === "entradas" ||
          inventoryTab === "conteo" ||
          inventoryTab === "ajustes" ||
          inventoryTab === "historial"
        ) {
          updates.inventoryTab = inventoryTab;
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },

      // Write to URL params
      syncToURL: () => {
        const state = get();
        const params = new URLSearchParams(window.location.search);

        // Set tab params
        params.set("tab", state.mainTab);

        // Only set inventoryTab if we're on inventory
        if (state.mainTab === "inventory") {
          params.set("inventoryTab", state.inventoryTab);
        } else {
          params.delete("inventoryTab");
        }

        // Update URL without reload
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
      },
    }),
    {
      name: "tab-storage", // localStorage key
    }
  )
);
