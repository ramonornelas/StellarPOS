import { Product } from "../products/products.model";
import { openSnackBarComboAdded } from "../snackbar/snackbar.motor";
import { fetchProductCombos } from "../products/products-api";

export const getComboUpdates = (cart: Product[], productList: Product[], applicableCombos: { productId: string; comboId: string; comboThreshold: number }[]) => {
  const comboUpdates = [];

  const productCounts = cart.reduce((acc, product) => {
    acc[product.id] = (acc[product.id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const { productId, comboId, comboThreshold } of applicableCombos) {
    const combosToAdd: Product[] = [];

    if (productCounts[productId]) {
      const comboProduct = productList.find((p) => p.id === comboId);
      if (comboProduct) {
        const combosToAddCount = Math.floor(productCounts[productId] / comboThreshold);

        if (combosToAddCount > 0) {
          for (let i = 0; i < combosToAddCount; i++) {
            combosToAdd.push(comboProduct);
          }
        }
      }
    }

    comboUpdates.push({
      comboId,
      combosToAdd
    });
  }

  return comboUpdates;
};

const updateCartWithCombos = async (
  updatedCart: Product[],
  products: Product[],
  setProductsInCart: React.Dispatch<React.SetStateAction<Product[]>>
) => {
  const applicableCombos = await getApplicableCombos();

  // Get combos to add
  const comboUpdates = getComboUpdates(updatedCart, products, applicableCombos);

  // Update the cart with combos
  let finalCart = [...updatedCart];

  comboUpdates.forEach(({ combosToAdd }) => {
    // Add combos
    combosToAdd.forEach((combo) => {
      openSnackBarComboAdded(combo.name, combo.price);
      finalCart.push(combo);

      // Remove products that are part of the combo
      const comboProducts = applicableCombos.find((c) => c.comboId === combo.id);
      if (comboProducts) {
        const { productId, comboThreshold } = comboProducts;
        for (let i = 0; i < comboThreshold; i++) {
          const index = finalCart.findIndex((product) => product.id === productId);
          if (index !== -1) {
            finalCart.splice(index, 1);
          }
        }
      }
    });
  });

  setProductsInCart(finalCart);
};

const getApplicableCombos = async (): Promise<{ productId: string; comboId: string; comboThreshold: number }[]> => {
  try {
    const combos = await fetchProductCombos();
    return combos.map((combo: any) => ({
      productId: combo.included_product_id,
      comboId: combo.id,
      comboThreshold: combo.included_product_quantity,
    }));
  } catch (error) {
    console.error("Error fetching applicable combos:", error);
    return [];
  }
};

export const updateCart = async (
  action: "add" | "subtract" | "delete",
  productsInCart: Product[],
  setProductsInCart: React.Dispatch<React.SetStateAction<Product[]>>,
  products: Product[],
  productToModify: Product
) => {
  if (!productToModify) return;

  let updatedCart = [...productsInCart];

  if (action === "add") {
    updatedCart.push(productToModify);
  } else if (action === "subtract") {
    for (let i = updatedCart.length - 1; i >= 0; i--) {
      if (updatedCart[i].id === productToModify.id) {
        updatedCart.splice(i, 1);
        break;
      }
    }
  } else if (action === "delete") {
    updatedCart = updatedCart.filter((p) => p.product_variant_id !== productToModify.product_variant_id);
  }

  await updateCartWithCombos(updatedCart, products, setProductsInCart);
};