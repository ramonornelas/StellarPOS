import { useEffect, useRef, useCallback } from "react";

interface BarcodeScannerOptions {
  onBarcodeScanned: (barcode: string) => void;
  minLength?: number;
  maxTimeBetweenChars?: number;
  enabled?: boolean;
}

/**
 * Custom hook to detect barcode scanner input from external USB/Bluetooth scanners.
 *
 * Barcode scanners typically act as keyboard input devices that type very rapidly
 * (< 100ms between characters) and send an Enter key at the end.
 *
 * @param options Configuration options for the barcode scanner
 * @param options.onBarcodeScanned Callback function called when a complete barcode is detected
 * @param options.minLength Minimum barcode length (default: 3)
 * @param options.maxTimeBetweenChars Maximum time between characters in ms (default: 100)
 * @param options.enabled Enable/disable the scanner (default: true)
 */
export const useBarcodeScanner = ({
  onBarcodeScanned,
  minLength = 3,
  maxTimeBetweenChars = 100,
  enabled = true,
}: BarcodeScannerOptions) => {
  const barcodeBuffer = useRef<string>("");
  const lastKeypressTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetBuffer = useCallback(() => {
    barcodeBuffer.current = "";
    lastKeypressTime.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if scanner is disabled
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastKeypress = currentTime - lastKeypressTime.current;

      // Handle Enter key - complete the scan
      if (event.key === "Enter") {
        event.preventDefault();

        const barcode = barcodeBuffer.current.trim();

        // Validate barcode length
        if (barcode.length >= minLength) {
          onBarcodeScanned(barcode);
        }

        resetBuffer();
        return;
      }

      // Ignore special keys (Shift, Control, Alt, etc.)
      if (event.key.length > 1) {
        return;
      }

      // If too much time has passed since last keypress, reset buffer
      if (
        lastKeypressTime.current > 0 &&
        timeSinceLastKeypress > maxTimeBetweenChars
      ) {
        resetBuffer();
      }

      // Add character to buffer
      barcodeBuffer.current += event.key;
      lastKeypressTime.current = currentTime;

      // Set timeout to reset buffer if no more input comes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(resetBuffer, maxTimeBetweenChars * 2);

      // Prevent default to avoid typing in the page
      event.preventDefault();
    },
    [enabled, minLength, maxTimeBetweenChars, onBarcodeScanned, resetBuffer]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Attach keyboard event listener
    window.addEventListener("keydown", handleKeyPress);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      resetBuffer();
    };
  }, [enabled, handleKeyPress, resetBuffer]);

  return {
    resetBuffer,
  };
};
