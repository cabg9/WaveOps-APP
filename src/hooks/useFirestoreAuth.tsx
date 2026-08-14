import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  doc
} from 'firebase/firestore';
import { auth, db } from '@/firebase-config';
import { User, AuthContextType, Role } from '@/types';
import { useDynamicDepartments } from "@/hooks/firestore/useDynamicDepartments";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { defaultDepartment } = useDynamicDepartments();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', fbUser.email)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userData = userDoc.data();
          setUser({
            id: userDoc.id,
            email: fbUser.email || '',
            name: userData.name || fbUser.displayName || 'Usuario',
            role: userData.role || Role.STAFF,
            department: userData.department || defaultDepartment,
            position: userData.position || '',
            level: userData.level || 7,
            isActive: userData.isActive !== false,
            mustChangePassword: userData.mustChangePassword || false,
            photoURL: userData.photoURL || '',
            profileComplete: userData.profileComplete || false,
          });

          // Listener en tiempo real para expulsar si desactivan al usuario
          const unsubscribeDoc = onSnapshot(doc(db, 'users', userDoc.id), (snap) => {
            if (!snap.exists() || snap.data()?.isActive === false) {
              console.error('[Auth] Usuario desactivado o eliminado — expulsando');
              signOut(auth);
              setUser(null);
            }
          });
          // Guardar para cleanup
          (window as any).__authUnsubscribe = unsubscribeDoc;
        } else {
          // BUG FIX: Usuario no existe en Firestore — no debe tener acceso
          console.error('[Auth] Usuario', fbUser.email, 'existe en Auth pero NO en Firestore — deslogueando');
          await signOut(auth);
          setUser(null);
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const usersQuery = query(collection(db, 'users'), where('email', '==', fbUser.email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.error('[Login] Usuario', fbUser.email, 'no existe en Firestore');
        await signOut(auth);
        setUser(null);
        return false;
      }
      
      const userData = usersSnapshot.docs[0].data();
      if (userData.isActive === false) {
        console.error('[Login] Usuario', fbUser.email, 'está desactivado');
        await signOut(auth);
        setUser(null);
        return false;
      }
      
      setUser({
        id: usersSnapshot.docs[0].id,
        email: fbUser.email || '',
        name: userData.name || fbUser.displayName || 'Usuario',
        role: userData.role || Role.STAFF,
        department: userData.department || defaultDepartment,
        position: userData.position || '',
        level: userData.level || 7,
        isActive: userData.isActive !== false,
        photoURL: userData.photoURL || '',
        profileComplete: userData.profileComplete || false,
      });
      return true;
    } catch (error: any) {
      console.error('Error de login:', error.code, error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    signOut(auth);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>): void => {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    const level = user.level || 7;
    switch (permission) {
      case 'canCreateTask': return level <= 6;
      case 'canCreateExtraTask': return level <= 6;
      case 'canReopenTask': return level <= 3;
      case 'canBlockTask': return level <= 6;
      case 'canUnblockTask': return level <= 6;
      case 'canVerifyTask': return level <= 7;
      case 'canRateTask': return level <= 7;
      case 'canEditAllTasks': return level <= 3;
      case 'canEditOwnTasks': return level <= 6;
      case 'canDeleteAllTasks': return level <= 2;
      case 'canDeleteOwnTasks': return level <= 6;
      case 'canCreateSpecificTask': return level <= 1;
      case 'canConfirmIncidenciaAsManager': return level <= 5;
      case 'canConfirmIncidenciaAsSupervisor': return level <= 6;
      case 'canResolveIncidencia': return level <= 6;
      case 'canCloseIncidencia': return level <= 4;
      case 'canReopenIncidencia': return level <= 6;
      case 'canCreateIncidencia': return level <= 7;
      case 'canViewAllIncidencias': return level <= 2;
      case 'canViewOperationalIncidencias': return level <= 4;
      case 'canViewOwnDepartmentIncidencias': return level <= 7;
      case 'canDeleteTask': return level <= 2;
      case 'canManageUsers': return level <= 2;
      case 'canCreateIncapacity': return level <= 6;
      case 'canApproveIncapacity': return level <= 3;
      case 'canViewAllDepartments': return level <= 4;
      case 'canCreateSolicitud': return level <= 7;
      case 'canApproveSolicitud': return level <= 4;
      case 'canCreateSchedule': return level <= 5;
      case 'canViewSchedule': return level <= 7;
      case 'canManageInventory': return level <= 5;
      case 'canAssignShifts': return level <= 5;
      case 'canModifyShifts': return level <= 5;
      case 'canApproveChanges': return level <= 4;
      case 'canRejectChanges': return level <= 4;
      case 'canRequestChange': return level <= 7;
      case 'canViewInventory': return level <= 7;
      default: return false;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser,
      isLoading, 
      isAuthenticated: !!user,
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
