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
  action: "add" | "subtract" | "delete" | "setQty",
  productsInCart: Product[],
  setProductsInCart: React.Dispatch<React.SetStateAction<Product[]>>,
  products: Product[],
  productToModify: Product
) => {
  if (!productToModify) {
    console.log("[updateCart] productToModify is undefined or null");
    return;
  }

  let updatedCart = [...productsInCart];
  console.log("[updateCart] action:", action);
  console.log("[updateCart] productsInCart before:", productsInCart);
  console.log("[updateCart] productToModify:", productToModify);

  if (action === "add") {
    const idx = updatedCart.findIndex(p => p.product_variant_id === productToModify.product_variant_id);
    if (idx !== -1) {
      let newQty = (updatedCart[idx].quantity ?? 1) + 1;
      newQty = Number(newQty.toFixed(3));
      updatedCart[idx] = { 
        ...updatedCart[idx], 
        quantity: newQty
      };
      console.log("[updateCart] Increased quantity for", productToModify.product_variant_id, "to", updatedCart[idx].quantity);
    } else {
      let qty = Number((productToModify.quantity ?? 1).toFixed(3));
      updatedCart.push({ ...productToModify, quantity: qty });
      console.log("[updateCart] Added new product:", productToModify.product_variant_id);
    }
  } else if (action === "subtract") {
    const idx = updatedCart.findIndex(p => p.product_variant_id === productToModify.product_variant_id);
    if (idx !== -1) {
      let newQty = (updatedCart[idx].quantity ?? 1) - 1;
      newQty = Number(newQty.toFixed(3));
      if (newQty > 0) {
        updatedCart[idx] = { ...updatedCart[idx], quantity: newQty };
        console.log("[updateCart] Decreased quantity for", productToModify.product_variant_id, "to", newQty);
      } else {
        updatedCart.splice(idx, 1);
        console.log("[updateCart] Removed product:", productToModify.product_variant_id);
      }
    }
  } else if (action === "delete") {
    updatedCart = updatedCart.filter((p) => p.product_variant_id !== productToModify.product_variant_id);
    console.log("[updateCart] Deleted product:", productToModify.product_variant_id);
  } else if (action === "setQty") {
    updatedCart = updatedCart.map((p) => {
      if (p.product_variant_id === productToModify.product_variant_id) {
        let qty = Number((productToModify.quantity ?? 1).toFixed(3));
        console.log("[updateCart] Setting quantity for", p.product_variant_id, "from", p.quantity, "to", qty);
        return { ...p, quantity: qty };
      }
      return p;
    });
  }

  console.log("[updateCart] updatedCart before combos:", updatedCart);

  await updateCartWithCombos(updatedCart, products, setProductsInCart);

  console.log("[updateCart] updateCartWithCombos called");
};