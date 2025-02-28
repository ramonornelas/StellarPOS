export interface ProductsInCart {
	desc: string;
	qty: number;
	unit: number;
	category: string;
	id: string;
	product_variant_id: string;
	payment_method?: string;
	ticket?: string;
	display_order?: number;
}

export interface Payment {
	id: number;
	amount: number;
	payment_method: string;
}