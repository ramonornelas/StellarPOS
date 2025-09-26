
import {
  useCanChangeDate,
  useCanViewOrdersReport,
  useCanViewCashRegisterHistory,
  useCanViewProductsAdmin,
} from "../components/users/userPermissionsContext";

export const permissions = {
  navbarCanChangeDate: useCanChangeDate,
  navbarCanViewOrdersReport: useCanViewOrdersReport,
  canViewCashRegisterHistory: useCanViewCashRegisterHistory,
  navbarCanViewProductsAdmin: useCanViewProductsAdmin,
};
