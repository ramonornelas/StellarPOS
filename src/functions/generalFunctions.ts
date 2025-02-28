export const formatDate = (dateString: string): string => {
  const dateParts = dateString.split('-');
  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
};

export function formatCurrency(amount: number, locale: string = 'en-US', currency: string = 'USD'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export const mapPaymentMethod = (method: string, abbreviated?: boolean): string => {
    if (abbreviated) {
        switch (method) {
            case 'cash':
                return 'Efectivo';
            case 'card':
                return 'Tarjeta';
            case 'transfer':
                return 'Transf.';
            case 'split':
                return 'Div.';
            default:
                return '?';
        }
    } else {
        switch (method) {
            case 'cash':
                return 'Efectivo';
            case 'card':
                return 'Tarjeta';
            case 'transfer':
                return 'Transferencia';
            case 'split':
                return 'Dividido';
            default:
                return '?';
        }
    }
};