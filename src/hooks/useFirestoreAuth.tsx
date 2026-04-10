// ═══════════════════════════════════════════════════════════════════
// HOOK DE AUTENTICACIÓN FIREBASE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/firebase-config';
import { User, Department, Role, Permission } from '@/types';
import { hasPermission as checkPermission } from '@/lib/permissions-config';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Obtener datos adicionales del usuario desde Firestore (buscar por email)
        try {
          console.log('DEBUG - Buscando usuario con email:', fbUser.email);
          
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', fbUser.email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          console.log('DEBUG - Documentos encontrados:', usersSnapshot.size);
          
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            console.log('DEBUG - Datos del usuario:', userData);
            console.log('DEBUG - Rol encontrado:', userData.role);
            
            setUser({
              id: usersSnapshot.docs[0].id,
              email: fbUser.email || '',
              name: userData.name || fbUser.displayName || 'Usuario',
              role: userData.role || Role.STAFF,
              department: userData.department || Department.DIVE_SHOP,
              position: userData.position || '',
              level: userData.level || 7,
              isActive: userData.isActive !== false,
            });
          } else {
            console.log('DEBUG - Usuario no encontrado en Firestore, usando defaults');
            // Usuario autenticado pero sin perfil en Firestore
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || 'Usuario',
              role: Role.STAFF,
              department: Department.DIVE_SHOP,
              position: '',
              level: 7,
              isActive: true,
            });
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      // Obtener datos del usuario desde Firestore (buscar por email)
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', fbUser.email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        setUser({
          id: usersSnapshot.docs[0].id,
          email: fbUser.email || '',
          name: userData.name || fbUser.displayName || 'Usuario',
          role: userData.role || Role.STAFF,
          department: userData.department || Department.DIVE_SHOP,
          position: userData.position || '',
          level: userData.level || 7,
          isActive: userData.isActive !== false,
        });
        return true;
      } else {
        // Usuario sin perfil en Firestore
        setUser({
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'Usuario',
          role: Role.STAFF,
          department: Department.DIVE_SHOP,
          position: '',
          level: 7,
          isActive: true,
        });
        return true;
      }
    } catch (error: any) {
      console.error('Error de login:', error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error de logout:', error);
    }
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
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
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
// FUNCIONES AUXILIARES PARA CREAR USUARIOS
// ═══════════════════════════════════════════════════════════════════

export async function createFirebaseUser(
  email: string,
  password: string,
  name: string,
  role: Role,
  department: Department,
  position: string,
  level: number
): Promise<string | null> {
  try {
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    
    // Actualizar display name
    await updateProfile(fbUser, { displayName: name });
    
    // Crear documento en Firestore
    await setDoc(doc(db, 'users', fbUser.uid), {
      email,
      name,
      role,
      department,
      position,
      level,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    
    return fbUser.uid;
  } catch (error: any) {
    console.error('Error al crear usuario:', error.message);
    return null;
  }
}
