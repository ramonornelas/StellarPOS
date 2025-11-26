import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBarcodeScanner } from "../components/products/useBarcodeScanner";

/**
 * Test unitario para el hook useBarcodeScanner
 *
 * Este hook detecta la entrada de escáneres de código de barras externos
 * que funcionan como dispositivos de teclado USB/Bluetooth
 */
describe("useBarcodeScanner Hook", () => {
  let mockCallback: (barcode: string) => void;

  beforeEach(() => {
    // Arrange: Crear un mock del callback antes de cada test
    mockCallback = vi.fn() as (barcode: string) => void;
  });

  afterEach(() => {
    // Cleanup: Limpiar todos los mocks después de cada test
    vi.clearAllMocks();
  });

  /**
   * Helper function para simular la entrada del escáner de código de barras
   */
  const simulateBarcodeInput = (barcode: string) => {
    // Simular cada carácter del código de barras
    for (const char of barcode) {
      const event = new KeyboardEvent("keydown", {
        key: char,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    }

    // Simular la tecla Enter al final
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(enterEvent);
  };

  it("debe llamar al callback cuando se escanea un código de barras válido", async () => {
    // Arrange: Renderizar el hook con el callback mock
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular el escaneo de un código de barras
    const testBarcode = "123456789";
    simulateBarcodeInput(testBarcode);

    // Assert: Verificar que el callback fue llamado con el código correcto
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(testBarcode);
    });
  });

  it("debe ignorar códigos de barras más cortos que minLength", async () => {
    // Arrange: Configurar el hook con minLength de 5
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        minLength: 5,
        enabled: true,
      })
    );

    // Act: Simular un código de barras corto (menos de 5 caracteres)
    simulateBarcodeInput("123");

    // Assert: Verificar que el callback NO fue llamado
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  it("debe aceptar códigos de barras que cumplan con minLength", async () => {
    // Arrange: Configurar el hook con minLength de 5
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        minLength: 5,
        enabled: true,
      })
    );

    // Act: Simular un código de barras válido (5 o más caracteres)
    const validBarcode = "12345";
    simulateBarcodeInput(validBarcode);

    // Assert: Verificar que el callback fue llamado
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(validBarcode);
    });
  });

  it("no debe llamar al callback cuando el hook está deshabilitado", async () => {
    // Arrange: Renderizar el hook con enabled: false
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: false,
      })
    );

    // Act: Simular el escaneo de un código de barras
    simulateBarcodeInput("123456789");

    // Assert: Verificar que el callback NO fue llamado
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  it("debe ignorar teclas especiales (Shift, Control, Alt, etc.)", async () => {
    // Arrange: Renderizar el hook
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular teclas especiales
    const specialKeys = ["Shift", "Control", "Alt", "Tab", "Escape"];
    specialKeys.forEach((key) => {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    });

    // Simular Enter (sin código de barras)
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback NO fue llamado
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  it("debe ignorar entrada cuando el usuario está escribiendo en un campo de texto", async () => {
    // Arrange: Crear un input element y renderizar el hook
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular entrada de teclado en el input
    const testBarcode = "123456789";
    for (const char of testBarcode) {
      const event = new KeyboardEvent("keydown", {
        key: char,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
    }

    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback NO fue llamado
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });

    // Cleanup: Remover el input del DOM
    document.body.removeChild(input);
  });

  it("debe ignorar entrada cuando el usuario está escribiendo en un textarea", async () => {
    // Arrange: Crear un textarea element y renderizar el hook
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular entrada de teclado en el textarea
    const testBarcode = "123456789";
    for (const char of testBarcode) {
      const event = new KeyboardEvent("keydown", {
        key: char,
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(event);
    }

    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback NO fue llamado
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });

    // Cleanup: Remover el textarea del DOM
    document.body.removeChild(textarea);
  });

  it("debe manejar múltiples escaneos consecutivos", async () => {
    // Arrange: Renderizar el hook
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular múltiples escaneos
    const barcodes = ["111111111", "222222222", "333333333"];

    for (const barcode of barcodes) {
      simulateBarcodeInput(barcode);
      // Pequeña pausa entre escaneos
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Assert: Verificar que el callback fue llamado para cada código
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenNthCalledWith(1, barcodes[0]);
      expect(mockCallback).toHaveBeenNthCalledWith(2, barcodes[1]);
      expect(mockCallback).toHaveBeenNthCalledWith(3, barcodes[2]);
    });
  });

  it("debe limpiar el buffer cuando se desmonta el componente", () => {
    // Arrange: Renderizar el hook
    const { unmount } = renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular entrada parcial (sin Enter)
    const event = new KeyboardEvent("keydown", {
      key: "1",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    // Desmontar el hook
    unmount();

    // Simular Enter después de desmontar
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback NO fue llamado
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("debe eliminar espacios en blanco al inicio y final del código de barras", async () => {
    // Arrange: Renderizar el hook
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular código de barras con espacios
    const barcodeWithSpaces = "  123456789  ";
    for (const char of barcodeWithSpaces) {
      const event = new KeyboardEvent("keydown", {
        key: char,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    }

    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback fue llamado con el código sin espacios
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith("123456789");
    });
  });

  it("debe usar los valores por defecto correctos", async () => {
    // Arrange: Renderizar el hook sin opciones personalizadas
    renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
      })
    );

    // Act: Simular un código de barras de 3 caracteres (minLength por defecto)
    simulateBarcodeInput("123");

    // Assert: Verificar que el callback fue llamado (minLength por defecto es 3)
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith("123");
    });
  });

  it("debe retornar una función resetBuffer", () => {
    // Arrange & Act: Renderizar el hook
    const { result } = renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Assert: Verificar que retorna un objeto con resetBuffer
    expect(result.current).toHaveProperty("resetBuffer");
    expect(typeof result.current.resetBuffer).toBe("function");
  });

  it("debe permitir resetear el buffer manualmente", async () => {
    // Arrange: Renderizar el hook
    const { result } = renderHook(() =>
      useBarcodeScanner({
        onBarcodeScanned: mockCallback,
        enabled: true,
      })
    );

    // Act: Simular entrada parcial
    const event = new KeyboardEvent("keydown", {
      key: "1",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    // Resetear el buffer manualmente
    result.current.resetBuffer();

    // Simular Enter
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(enterEvent);

    // Assert: Verificar que el callback NO fue llamado (buffer estaba vacío)
    await waitFor(() => {
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
