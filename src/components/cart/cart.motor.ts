import { Product } from "../products/products.model";
import { ProductsInCart } from "./cart.model";

export function priceRow(qty: number, unit: number) {
	return qty * unit;
}

export const groupProducts = (products: Product[]): ProductsInCart[] => {
	const productsGrouped = products.reduce((acc, product) => {
		const found = acc.find((item) => item.product_variant_id === product.product_variant_id);
		if (found) {
			found.qty += 1;
		} else {
				acc.push({
					desc: product.name,
					qty: product.quantity ?? 1,
					unit: product.price,
					id: product.id,
					product_variant_id: product.product_variant_id,
					category: product.category_id
				});

		}
		return acc;
	}, [] as ProductsInCart[]);
	return productsGrouped;
};

export const calcTotal = (products: ProductsInCart[]) => {
	return products.reduce((acc, curr) => acc + curr.qty * curr.unit, 0);
}

export const isCartEmpty = (products: Product[]) => {
	return !(products.length > 0);
}

export const searchProductByIdInCart = (id: string, productsInCart: Product[]): Product => {
	return productsInCart.find((product) => product.product_variant_id === id)!;
}

export const existsIDInCart = (id: string, productsInCart: Product[]): boolean => {
	return productsInCart.some((product) => product.product_variant_id === id);
}

export const deleteProductFromCart = (id: string, productsInCart: Product[]): Product[] => {
	return productsInCart.filter((product) => product.product_variant_id !== id);
}

export const countNumberOfSameProducts = (id: string, productsInCart: Product[]): number => {
	return productsInCart.filter((product) => product.product_variant_id === id).length;
}

export const formattedDescription = (desc : string) => {
	const trimmedDesc = desc.length > 15 ? `${desc.substring(0, 15)}…` : desc;
	return trimmedDesc;
};