// ═══════════════════════════════════════════════════════════════════
// HOOK DE USUARIOS FIRESTORE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Department, Role } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface FirestoreUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Department;
  position: string;
  level: number;
  isActive: boolean;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useFirestoreUsers() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLLECTION_NAME = 'users';

  // ═══════════════════════════════════════════════════════════════════
  // ESCUCHAR USUARIOS EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('name', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as FirestoreUser[];
          setUsers(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error al cargar usuarios:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error al inicializar usuarios:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // OBTENER TODOS LOS USUARIOS
  // ═══════════════════════════════════════════════════════════════════

  const getUsers = useCallback(async (): Promise<FirestoreUser[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreUser[];
    } catch (err: any) {
      console.error('Error al obtener usuarios:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // OBTENER USUARIO POR ID
  // ═══════════════════════════════════════════════════════════════════

  const getUserById = useCallback(async (id: string): Promise<FirestoreUser | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as FirestoreUser;
      }
      return null;
    } catch (err: any) {
      console.error('Error al obtener usuario:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // OBTENER USUARIOS POR DEPARTAMENTO
  // ═══════════════════════════════════════════════════════════════════

  const getUsersByDepartment = useCallback(async (department: Department): Promise<FirestoreUser[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreUser[];
    } catch (err: any) {
      console.error('Error al obtener usuarios por departamento:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // OBTENER USUARIOS POR ROL
  // ═══════════════════════════════════════════════════════════════════

  const getUsersByRole = useCallback(async (role: Role): Promise<FirestoreUser[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('role', '==', role),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreUser[];
    } catch (err: any) {
      console.error('Error al obtener usuarios por rol:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // BUSCAR USUARIO POR EMAIL
  // ═══════════════════════════════════════════════════════════════════

  const getUserByEmail = useCallback(async (email: string): Promise<FirestoreUser | null> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        } as FirestoreUser;
      }
      return null;
    } catch (err: any) {
      console.error('Error al buscar usuario por email:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // CREAR USUARIO (solo perfil en Firestore, no auth)
  // ═══════════════════════════════════════════════════════════════════

  const createUser = useCallback(async (userData: Omit<FirestoreUser, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...userData,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ACTUALIZAR USUARIO
  // ═══════════════════════════════════════════════════════════════════

  const updateUser = useCallback(async (id: string, updates: Partial<FirestoreUser>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      } as DocumentData);
    } catch (err: any) {
      console.error('Error al actualizar usuario:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // DESACTIVAR USUARIO (no eliminar, solo desactivar)
  // ═══════════════════════════════════════════════════════════════════

  const deactivateUser = useCallback(async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        isActive: false,
        deactivatedAt: new Date().toISOString(),
      } as DocumentData);
    } catch (err: any) {
      console.error('Error al desactivar usuario:', err);
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ELIMINAR USUARIO (solo Firestore, no auth)
  // ═══════════════════════════════════════════════════════════════════

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    getUsers,
    getUserById,
    getUsersByDepartment,
    getUsersByRole,
    getUserByEmail,
    createUser,
    updateUser,
    deactivateUser,
    deleteUser,
  };
}
