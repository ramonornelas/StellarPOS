import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { fetchUserPermissions } from "./users-api";

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

export const UserPermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem("stellar_userid");
    if (
      userId &&
      fetchedForUser.current !== userId
    ) {
      fetchedForUser.current = userId;
      fetchPermissions(userId);
    }
  }, []);

  const fetchPermissions = async (id: string) => {
    try {
      const perms = await fetchUserPermissions(id);
      setPermissions(perms);
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

export const hasPermission = (permissionName: string): boolean => {
  const { permissions } = useUserPermissions();
  return (permissions ?? []).some((p) => p.name === permissionName);
};