import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    isLoggedIn: boolean;
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isLoggedIn, children }) => {
    return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

export default ProtectedRoute;
