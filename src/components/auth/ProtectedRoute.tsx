import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** If provided, only these roles can access the route */
    roles?: UserRole[];
}

/**
 * Wraps a route:
 * - Not logged in → redirect to /signin
 * - Logged in but wrong role → redirect to /unauthorized
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
