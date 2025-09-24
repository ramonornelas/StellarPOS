import { useMemo, useContext } from "react";
import { Product } from "./products.model";
import { appContext } from "../../appContext";
import { filterProductsByCategoryAndSearch } from "./products.motor";

export const useProductSearch = (products: Product[], category: string) => {
  const { searchTerm } = useContext(appContext).searchCTX;

  const filteredProducts = useMemo(() => {
    const filtered = filterProductsByCategoryAndSearch(
      products,
      category,
      searchTerm
    );

    return filtered
      .filter((product) => product.is_active)
      .sort((a, b) => a.display_order - b.display_order);
  }, [products, category, searchTerm]);

  return {
    searchTerm,
    filteredProducts,
    hasSearchTerm: searchTerm.trim().length > 0,
  };
};
