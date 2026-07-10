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
import { db, auth } from '@/firebase-config';
import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser } from 'firebase/auth';
import { Role } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface FirestoreUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  position: string;
  level: number;
  isActive: boolean;
  deletedAt?: string;
  tempPassword?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useFirestoreUsers() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [trashedUsers, setTrashedUsers] = useState<FirestoreUser[]>([]);
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
          const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
              createdAt: docData.createdAt?.toDate?.() 
                ? docData.createdAt.toDate().toISOString() 
                : docData.createdAt,
            };
          }) as FirestoreUser[];
          const active = data.filter(u => !u.deletedAt);
          const deleted = data.filter(u => u.deletedAt);
          setUsers(active);
          setTrashedUsers(deleted);
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

  const getUsersByDepartment = useCallback(async (department: string): Promise<FirestoreUser[]> => {
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

  const createUser = useCallback(async (userData: Omit<FirestoreUser, 'id'> & { password: string }): Promise<{ id: string; password: string }> => {
    try {
      // Crear en Firestore con addDoc (no cambia la sesion de Auth)
      const userForFirestore = { ...userData };
      delete (userForFirestore as any).password;
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...userForFirestore,
        tempPassword: userData.password,
        createdAt: new Date().toISOString(),
      });
      return { id: docRef.id, password: userData.password };
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
  // SOFT-DELETE USUARIO
  // ═══════════════════════════════════════════════════════════════════

  const softDeleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        deletedAt: new Date().toISOString(),
        isActive: false,
      } as DocumentData);
    } catch (err: any) {
      console.error('Error al soft-delete usuario:', err);
      throw err;
    }
  }, []);

  // RESTAURAR USUARIO
  // ═══════════════════════════════════════════════════════════════════

  const restoreUser = useCallback(async (id: string): Promise<void> => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        deletedAt: null,
        isActive: true,
      } as DocumentData);
    } catch (err: any) {
      console.error('Error al restaurar usuario:', err);
      throw err;
    }
  }, []);

  // ELIMINAR USUARIO PERMANENTEMENTE
  // ═══════════════════════════════════════════════════════════════════

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      // Eliminar de Firestore primero
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      // Intentar eliminar de Auth (puede fallar si no es el usuario actual)
      try {
        // NOTA: Solo el usuario actual o un admin puede eliminar de Auth
        // En produccion se usaria Cloud Function para esto
        console.log('[deleteUser] Usuario eliminado de Firestore. Para eliminar de Auth se requiere Cloud Function.');
      } catch {
        // Ignorar error de Auth
      }
    } catch (err: any) {
      console.error('Error al eliminar usuario permanentemente:', err);
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
    // createUser now returns { id, password }
    updateUser,
    deactivateUser,
    softDeleteUser,
    restoreUser,
    deleteUser,
    trashedUsers,
  };
}
