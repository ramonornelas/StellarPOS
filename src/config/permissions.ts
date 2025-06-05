import { hasPermission } from "../components/users/userPermissionsContext";

export const permissions = {
    navbarCanChangeDate: () => hasPermission('change_date'),
    navbarCanViewOrdersReport: () => hasPermission('view_orders_report'),
    canViewCashRegisterHistory: () => hasPermission('view_cash_register_history'),
};