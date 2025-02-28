import React, { createContext, useState, useEffect } from "react";
import { Category, Product, ProductVariant } from "./components/products/products.model";
import { fetchCategories, fetchProducts, fetchProductVariants } from "./components/products/products-api";

interface DataContextType {
  categories: Category[];
  products: Product[];
  productVariants: ProductVariant[];
  drawerLinks: { title: string; filter: string }[];
}

export const DataContext = createContext<DataContextType>({
  categories: [],
  products: [],
  productVariants: [],
  drawerLinks: [],
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedCategories = await fetchCategories();
      const fetchedProducts = await fetchProducts();
      const fetchedProductVariants = await fetchProductVariants();

      setCategories(fetchedCategories);

      const processedProducts = fetchedProducts.map((product: Product) => ({
        ...product,
        price: product.price ? Number(product.price) : 0,
        product_variant_id: product.product_variant_id ? product.product_variant_id : product.id
      }));
      setProducts(processedProducts);

      const processedProductVariants = fetchedProductVariants.map((variant: ProductVariant) => ({
        ...variant,
        price: variant.price ? Number(variant.price) : 0,
        display_order: variant.display_order ? Number(variant.display_order) : 0
      }));
      setProductVariants(processedProductVariants);

    };

    fetchData();
  }, []);

  const drawerLinks = [
      { title: "Todos los productos", filter: "all" },
      ...categories
        .sort((a, b) => a.display_order - b.display_order)
        .map(category => ({
          title: category.name,
          filter: category.id,
        }))
  ];

  return (
    <DataContext.Provider value={{ categories, products, productVariants, drawerLinks }}>
      {children}
    </DataContext.Provider>
  );
};