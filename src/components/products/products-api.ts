import { BASE_URL, API_STAGE } from "../../apiConfig";
import {
  Product,
  InventoryMovementRequest,
  InventoryMovementResponse,
} from "./products.model";

const getApiUrl = (path: string, baseUrl: string = BASE_URL) => {
  return API_STAGE === "PROD"
    ? `${baseUrl}/${path}`
    : `${baseUrl}/${API_STAGE}/${path}`;
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await fetch(getApiUrl(`products/${id}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error deleting product");
    }
    return await response.json();
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};
export const updateProduct = async (id: string, product: Partial<Product>) => {
  try {
    const response = await fetch(getApiUrl(`products/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error("Error updating product");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};
export const addProduct = async (product: Partial<Product>) => {
  try {
    const response = await fetch(getApiUrl("products"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      throw new Error("Error adding product");
    }
    return await response.json();
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

export const fetchProducts = async () => {
  try {
    const response = await fetch(getApiUrl("products"));
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const response = await fetch(`${BASE_URL}/categories`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const fetchProductVariants = async () => {
  try {
    const response = await fetch(getApiUrl("product_variants"));
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return [];
  }
};

export const fetchProductCombos = async () => {
  try {
    const response = await fetch(`${BASE_URL}/products/combos`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching product combos:", error);
    return [];
  }
};

// Función para validar archivos de imagen
export const validateImageFile = (
  file: File
): { isValid: boolean; error?: string } => {
  // Validar extensiones permitidas
  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "webp"];
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: "Solo se permiten archivos PNG, JPG, JPEG, GIF y WEBP",
    };
  }

  // Validar tamaño (400KB = 400 * 1024 bytes)
  const maxSizeBytes = 400 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: "El archivo no debe ser mayor a 400KB",
    };
  }

  return { isValid: true };
};

// Función para convertir archivo a base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remover el prefijo "data:image/xxx;base64,"
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Función para subir imagen al endpoint de media
export const uploadProductImage = async (file: File) => {
  try {
    // Validar archivo
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Convertir a base64
    const base64Data = await fileToBase64(file);

    // Obtener extensión del archivo
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    // Usar el nombre original del archivo sin extensión como custom_name
    // Reemplazar espacios en blanco con guiones bajos
    const originalFileName = file.name
      .split(".")
      .slice(0, -1)
      .join(".")
      .replace(/\s+/g, "_");

    // Preparar payload
    const payload = {
      image_data: base64Data,
      file_extension: fileExtension,
      custom_name: originalFileName,
      folder: "products",
      make_public: true,
    };

    // Hacer request al endpoint
    const response = await fetch(getApiUrl("media"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error al subir la imagen");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const fetchProductVariantsByProductId = async (productId: string) => {
  try {
    const response = await fetch(getApiUrl(`products/${productId}/variants`));
    if (!response.ok) throw new Error("Error fetching product variants");
    return await response.json();
  } catch (error) {
    console.error("Error fetching product variants by product id:", error);
    return [];
  }
};

export const addProductVariant = async (
  productId: string,
  variant: { name: string; price: number; display_order: number }
) => {
  try {
    const response = await fetch(getApiUrl(`products/${productId}/variants`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(variant),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.message || "Error al agregar variante"
      );
    }
    const data = await response.json();
    return data.variant;
  } catch (error: unknown) {
    console.error("Error adding product variant:", error);
    throw error;
  }
};

export const updateProductVariant = async (
  productId: string,
  variantId: string,
  variant: { name?: string; price?: number; display_order?: number }
) => {
  try {
    const response = await fetch(
      getApiUrl(`products/${productId}/variants/${variantId}`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(variant),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.message || "Error al actualizar variante"
      );
    }
    const data = await response.json();
    return data.variant;
  } catch (error: unknown) {
    console.error("Error updating product variant:", error);
    throw error;
  }
};

export const deleteProductVariant = async (
  productId: string,
  variantId: string
) => {
  try {
    const response = await fetch(
      getApiUrl(`products/${productId}/variants/${variantId}`),
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.message || "Error al eliminar variante"
      );
    }
    return await response.json();
  } catch (error: unknown) {
    console.error("Error deleting product variant:", error);
    throw error;
  }
};

// Función para crear movimientos de inventario
export const createInventoryMovement = async (
  movementData: InventoryMovementRequest
): Promise<InventoryMovementResponse> => {
  try {
    const response = await fetch(getApiUrl("inventory/movements"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(movementData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          errorData.error ||
          "Error al crear movimiento de inventario"
      );
    }

    const data: InventoryMovementResponse = await response.json();
    return data;
  } catch (error: unknown) {
    console.error("Error creating inventory movement:", error);
    throw error;
  }
};
