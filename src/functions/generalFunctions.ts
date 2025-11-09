export const formatDate = (dateString: string): string => {
  const dateParts = dateString.split("-");
  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
};

export function formatCurrency(
  amount: number,
  locale: string = "en-US",
  currency: string = "USD"
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount
  );
}

export const mapPaymentMethod = (
  method: string,
  abbreviated?: boolean
): string => {
  if (abbreviated) {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transf.";
      case "split":
        return "Div.";
      default:
        return "?";
    }
  } else {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transferencia";
      case "split":
        return "Dividido";
      default:
        return "?";
    }
  }
};

/**
 * Formats a datetime string to DD/MM/YYYY HH:MM format in local timezone
 *
 * Handles timezone conversion automatically:
 * - UTC timestamps (ending with 'Z') are converted to local time
 * - ISO strings with timezone info are properly converted
 * - Backend datetime strings (without timezone) are treated as UTC and converted to local time
 * - Date-only strings are formatted as-is at 00:00
 *
 * Examples:
 * - "2025-10-21T14:30:00Z" (UTC) -> "21/10/2025 16:30" (if local is UTC+2)
 * - "2025-10-21T14:30:00.123456" (backend UTC) -> "21/10/2025 16:30" (if local is UTC+2)
 * - "2025-10-21" (date only) -> "21/10/2025 00:00"
 */
export const formatDateTime = (dateTimeString: string): string => {
  try {
    let processedDateString = dateTimeString;

    // Check if this is a backend datetime string (has time but no timezone info)
    const isBackendDateTime =
      dateTimeString.includes("T") &&
      !dateTimeString.endsWith("Z") &&
      !dateTimeString.includes("+") &&
      !dateTimeString.includes("-", 19); // Don't match the date separators

    if (isBackendDateTime) {
      // Backend sends UTC time as local string - append 'Z' to treat as UTC
      processedDateString = dateTimeString.endsWith("Z")
        ? dateTimeString
        : dateTimeString + "Z";
    }

    // Create date object - this automatically handles timezone conversion
    const date = new Date(processedDateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string provided:", dateTimeString);
      return dateTimeString;
    }

    // Format as DD/MM/YYYY HH:MM in local timezone
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return dateTimeString; // fallback to original string
  }
};
