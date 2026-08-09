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
  nickname?: string;
  cedula?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  photoURL?: string;
  authUid?: string;
  authCreated?: boolean;
  authCreatedAt?: string;
  mustChangePassword?: boolean;
  profileComplete?: boolean;
  invitationPending?: boolean;
  invitedAt?: string;
  updatedAt?: string;
  joinDate?: string;
  displayName?: string;
  nationality?: string;
  passport?: string;
  bloodType?: string;
  allergies?: string;
  medications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  certificationNumber?: string;
  certificationExpiry?: string;
  apneaCert?: string;
  bankCountry?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  routingNumber?: string;
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

  const createUser = useCallback(async (userData: Omit<FirestoreUser, 'id'> & { password?: string; joinDate?: string }): Promise<{ id: string; password?: string }> => {
    try {
      const userForFirestore = { ...userData };
      delete (userForFirestore as any).password;
      const docData: any = {
        ...userForFirestore,
        createdAt: new Date().toISOString(),
      };
      // Solo guardar tempPassword si se proporcionó (sin invitación)
      if (userData.password) {
        docData.tempPassword = userData.password;
        docData.mustChangePassword = true;
      } else {
        docData.mustChangePassword = false;
      }
      if (userData.joinDate) {
        docData.joinDate = userData.joinDate;
      }
      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
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

  const deactivateUser = useCallback(async (user: any): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, user.id);
      await updateDoc(docRef, {
        isActive: false,
        deactivatedAt: new Date().toISOString(),
      } as DocumentData);
      // Desactivar en Firebase Auth para que no pueda hacer login
      if (user.authUid) {
        try {
          await fetch('https://us-central1-wve-b3db5.cloudfunctions.net/setAuthUserDisabled', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({uid: user.authUid, disabled: true}),
          });
        } catch (err) {
          console.error('[deactivateUser] Error disabling auth:', err);
        }
      }
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

  const deleteUser = useCallback(async (user: any): Promise<void> => {
    try {
      // Llamar Cloud Function para cleanup (Auth + invitaciones + Firestore)
      try {
        const res = await fetch('https://us-central1-wve-b3db5.cloudfunctions.net/cleanupUserData', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId: user.id, email: user.email}),
        });
        const result = await res.json();
        console.log('[deleteUser] Cleanup:', result);
      } catch (err) {
        console.error('[deleteUser] Error cleanup:', err);
        // Fallback: eliminar solo de Firestore
        await deleteDoc(doc(db, COLLECTION_NAME, user.id));
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
