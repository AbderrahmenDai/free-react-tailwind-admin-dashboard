import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/authService';

export type UserRole =
    | 'ADMIN'
    | 'METHODE'
    | 'SUPERVISEUR'
    | 'AGENT_CONTROLE'
    | 'AGENT_TICKET'
    | 'OPERATOR'
    | 'SUPERVISOR';

export interface AuthUser {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch current user on mount (validates session cookie)
    useEffect(() => {
        authApi.me()
            .then((data) => setUser(data.user ?? data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (username: string, password: string) => {
        const data = await authApi.login(username, password);
        // Save token if returned in response body
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
        // After login, fetch full user profile
        const me = await authApi.me();
        setUser(me.user ?? me);
        return data;
    };

    const logout = async () => {
        localStorage.removeItem('token');
        await authApi.logout();
        setUser(null);
    };

    const hasRole = useCallback(
        (...roles: UserRole[]) => !!user && roles.includes(user.role),
        [user]
    );

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
