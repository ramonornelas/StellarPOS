import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import { fetchUserPermissions } from "../../functions/apiFunctions";

type Permission = {
  id: string;
  name: string;
};

interface UserPermissionsContextType {
  permissions: Permission[];
  fetchPermissions: (userId: string) => Promise<void>;
}

const UserPermissionsContext = createContext<UserPermissionsContextType>({
  permissions: [],
  fetchPermissions: async () => {},
});

export const UserPermissionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem("stellar_userid");
    if (userId && fetchedForUser.current !== userId) {
      fetchedForUser.current = userId;
      fetchPermissions(userId);
    }
  }, []);

  const fetchPermissions = async (id: string) => {
    try {
      const perms = await fetchUserPermissions(id);
      if (Array.isArray(perms)) {
        setPermissions(perms);
      } else {
        setPermissions([]);
        console.error("fetchUserPermissions did not return an array:", perms);
      }
    } catch (error) {
      setPermissions([]);
    }
  };

  return (
    <UserPermissionsContext.Provider value={{ permissions, fetchPermissions }}>
      {children}
    </UserPermissionsContext.Provider>
  );
};

export const useUserPermissions = () => useContext(UserPermissionsContext);

export const useCanChangeDate = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "change_date");
};

export const useCanViewOrdersReport = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_orders_report");
};

export const useCanViewCashRegisterHistory = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_cash_register_history");
};

export const useCanViewProductsAdmin = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_products_admin");
};

export const useCanViewProducts = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_products");
};

export const useCanViewInventoryEntries = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_inventory_entries");
};

export const useCanViewInventoryPhysicalCount = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_inventory_physical_count");
};

export const useCanViewInventoryAdjustments = (): boolean => {
  const { permissions } = useUserPermissions();
  return hasPermission(permissions, "view_inventory_adjustments");
};

export const hasPermission = (
  permissions: Permission[] | undefined,
  permissionName: string
): boolean => {
  return (
    Array.isArray(permissions) &&
    permissions.some((p) => p.name === permissionName)
  );
};
