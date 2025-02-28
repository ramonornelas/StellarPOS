export interface Product {
  name: string;
  price: number;
  category_id: string;
  id: string;
  has_variants: boolean;
  image_url: string;
  category_name: string;
  description: string;
  is_combo: boolean;
  product_variant_id: string;
  display_order: number;
  quantity?: number;
}

export interface ProductVariant {
  description: string;
  id: string;
  price: number;
  name: string;
  product_name: string;
  product_id: string;
  display_order: number;
  category_id: string;
  category_name: string;
  has_variants: boolean;
}

export interface Category {
  name: string;
  id: string;
  display_order: number;
}
