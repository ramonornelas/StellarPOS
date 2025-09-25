import {
  useCanChangeDate,
  useCanViewOrdersReport,
  useCanViewCashRegisterHistory,
} from "../components/users/userPermissionsContext";

export const permissions = {
  navbarCanChangeDate: useCanChangeDate,
  navbarCanViewOrdersReport: useCanViewOrdersReport,
  canViewCashRegisterHistory: useCanViewCashRegisterHistory,
};
