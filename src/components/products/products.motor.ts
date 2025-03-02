import { existsIDInCart } from "../cart/cart.motor";
import { Product, ProductVariant } from "./products.model";
import { useContext } from "react";
import { DataContext } from "../../dataContext";

export const filterProducts = (productList: Product[], category: string): Product[] => {
    if (category === 'all') {
        return productList;
    }

    const productsFiltered = productList.filter((product: Product) => {
        if (product.category_id === category) {
            return product;
        }
    });
    return productsFiltered;
};

export const returnCategoryName = (filter: string): string => {
    const { categories } = useContext(DataContext);

    if (filter === "all") {
        return "Todo";
    }

    const category = categories.find(category => category.id === filter);
    return category ? category.name : "Todo";
}

export const searchProductById = (products: Product[], id: string): Product => {
    return products.find((product) => product.id === id)!;
}

export const searchVariantById = (productVariants: ProductVariant[], id: string): ProductVariant => {
    return productVariants.find((productVariant) => productVariant.id === id)!;
}

export const searchProductByBarcode = (products: any[], barcode: string) => {
    return products.find(product => product.barcode === barcode);
};

export const generateCustomID = (productsInCart: Product[]): string => {
    let newCustomId;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    do {
        newCustomId = '';
        for (let i = 0; i < 8; i++) {
            newCustomId += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    } while (existsIDInCart(newCustomId, productsInCart));
    return newCustomId;
}