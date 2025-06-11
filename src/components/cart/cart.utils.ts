import { Product } from "../products/products.model";
import { openSnackBarComboAdded } from "../snackbar/snackbar.motor";
import { fetchProductCombos } from "../products/products-api";

export const getComboUpdates = (
  cart: Product[],
  productList: Product[],
  applicableCombos: { productId: string; comboId: string; comboThreshold: number }[]
) => {
  const comboUpdates = [];

  const productCounts = cart.reduce((acc, product) => {
    acc[product.id] = (acc[product.id] || 0) + (product.quantity ?? 1);
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

  // Get all combos to add
  const allCombosToAdd = comboUpdates.flatMap(({ combosToAdd }) => combosToAdd);

  // Filter unique combos by id for the confirmation message
  const uniqueCombosToAdd = allCombosToAdd.filter(
    (combo, index, self) => self.findIndex(c => c.id === combo.id) === index
  );

  let finalCart = [...updatedCart];

  if (uniqueCombosToAdd.length > 0) {
    // Show only unique combos in the confirmation message
    const combosMsg = uniqueCombosToAdd
      .map(combo => `• ${combo.name} por $${combo.price}`)
      .join('\n');

    const confirmCombo = window.confirm(
      `¿Quieres aplicar los siguientes combos?\n${combosMsg}`
    );

    if (confirmCombo) {
      // Group combos by id to know how many of each to apply
      const comboCountMap: Record<string, number> = {};
      allCombosToAdd.forEach(combo => {
        comboCountMap[combo.id] = (comboCountMap[combo.id] || 0) + 1;
      });

      // First, remove the required products for each combo
      Object.entries(comboCountMap).forEach(([comboId, count]) => {
        const comboProducts = applicableCombos.find((c) => c.comboId === comboId);
        if (comboProducts) {
          const { productId, comboThreshold } = comboProducts;
          const totalToRemove = count * comboThreshold;
          let toRemove = totalToRemove;

          for (let i = 0; i < finalCart.length && toRemove > 0; i++) {
            if (finalCart[i].id === productId) {
              const qty = finalCart[i].quantity ?? 1;
              if (qty > toRemove) {
                finalCart[i].quantity = qty - toRemove;
                toRemove = 0;
              } else {
                toRemove -= qty;
                finalCart.splice(i, 1);
                i--;
              }
            }
          }
        }
      });

      // Then, add the combos to the cart
      const comboQuantityMap: Record<string, { combo: Product; quantity: number }> = {};

      allCombosToAdd.forEach((combo) => {
        if (comboQuantityMap[combo.id]) {
          comboQuantityMap[combo.id].quantity += 1;
        } else {
          comboQuantityMap[combo.id] = { combo, quantity: 1 };
        }
      });

      Object.values(comboQuantityMap).forEach(({ combo, quantity }) => {
        // Check if the combo already exists in the cart
        const existingIdx = finalCart.findIndex(
          (item) => item.id === combo.id
        );
        if (existingIdx !== -1) {
          // If it exists, add the quantity
          const prevQty = finalCart[existingIdx].quantity ?? 1;
          finalCart[existingIdx].quantity = prevQty + quantity;
        } else {
          // If it doesn't exist, push it
          const comboWithQty = { ...combo, quantity };
          finalCart.push(comboWithQty);
        }
      });

      // Show a single snackbar message indicating the number of combos added for each type
      const comboSummary = Object.entries(comboCountMap)
        .map(([comboId, count]) => {
          const combo = allCombosToAdd.find(c => c.id === comboId);
          return combo ? `${count} × ${combo.name} ($${combo.price})` : '';
        })
        .filter(Boolean)
        .join('\n');
      if (comboSummary) {
        openSnackBarComboAdded(
          `Combos agregados:\n${comboSummary}`
        );
      }
    }
    // If not confirmed, do not apply any combo
  }

  setProductsInCart(finalCart);
};

const getApplicableCombos = async (): Promise<{ productId: string; comboId: string; comboThreshold: number }[]> => {
  try {
    const combos = await fetchProductCombos();
    return combos.map((combo: any) => ({
      productId: combo.included_product_id,
      comboId: combo.product_id,
      comboThreshold: combo.included_product_quantity,
    }));
  } catch (error) {
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
    return;
  }

  let updatedCart = [...productsInCart];

  if (action === "add") {
    const idx = updatedCart.findIndex(p => p.product_variant_id === productToModify.product_variant_id);
    if (idx !== -1) {
      let newQty = (updatedCart[idx].quantity ?? 1) + 1;
      newQty = Number(newQty.toFixed(3));
      updatedCart[idx] = { 
        ...updatedCart[idx], 
        quantity: newQty
      };
    } else {
      let qty = Number((productToModify.quantity ?? 1).toFixed(3));
      updatedCart.push({ ...productToModify, quantity: qty });
    }
  } else if (action === "subtract") {
    const idx = updatedCart.findIndex(p => p.product_variant_id === productToModify.product_variant_id);
    if (idx !== -1) {
      let newQty = (updatedCart[idx].quantity ?? 1) - 1;
      newQty = Number(newQty.toFixed(3));
      if (newQty > 0) {
        updatedCart[idx] = { ...updatedCart[idx], quantity: newQty };
      } else {
        updatedCart.splice(idx, 1);
      }
    }
  } else if (action === "delete") {
    updatedCart = updatedCart.filter((p) => p.product_variant_id !== productToModify.product_variant_id);
  } else if (action === "setQty") {
    updatedCart = updatedCart.map((p) => {
      if (p.product_variant_id === productToModify.product_variant_id) {
        let qty = Number((productToModify.quantity ?? 1).toFixed(3));
        return { ...p, quantity: qty };
      }
      return p;
    });
  }

  // Fetch combos only once
  const applicableCombos = await getApplicableCombos();

  // Check if the modified product affects any combo
  const affectsCombo = applicableCombos.some(
    combo => combo.productId === productToModify.id
  );

  if (affectsCombo) {
    await updateCartWithCombos(updatedCart, products, setProductsInCart);
  } else {
    setProductsInCart(updatedCart);
  }
};