// ═══════════════════════════════════════════════════════════════════
// HOOK DE AUTENTICACIÓN - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType, Permission } from '@/types';
import { users, getUserByEmail } from '@/data/users';
import { hasPermission as checkPermission } from '@/lib/permissions-config';

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('galapagos_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Verificar que el usuario existe en nuestros datos
          const validUser = users.find(u => u.id === parsedUser.id && u.isActive);
          if (validUser) {
            setUser(validUser);
          } else {
            localStorage.removeItem('galapagos_user');
          }
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('galapagos_user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Buscar usuario por email
      const foundUser = getUserByEmail(email);
      
      if (!foundUser) {
        console.log('User not found:', email);
        return false;
      }
      
      if (!foundUser.isActive) {
        console.log('User is inactive:', email);
        return false;
      }
      
      // Validar contraseña (en producción esto sería bcrypt)
      // Por ahora, cualquier contraseña de 6+ caracteres funciona para demo
      if (password.length < 6) {
        return false;
      }
      
      // Guardar usuario en estado y localStorage
      setUser(foundUser);
      localStorage.setItem('galapagos_user', JSON.stringify(foundUser));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('galapagos_user');
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE USER
  // ═══════════════════════════════════════════════════════════════════

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('galapagos_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // CHECK PERMISSION
  // ═══════════════════════════════════════════════════════════════════

  const hasPermission = useCallback((permission: Permission): boolean => {
    return checkPermission(user, permission);
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════════════════════════════════

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK AUXILIAR PARA VERIFICAR AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════

export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated && !auth.isLoading) {
    // En un componente, esto debería redirigir al login
    console.warn('User is not authenticated');
  }
  
  return auth;
}
