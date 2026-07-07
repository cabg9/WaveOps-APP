import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, getDocs, where,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import type { Department, DepartmentFormData } from '@/types/department';

const COLLECTION = 'departments';

function docToDepartment(id: string, data: any): Department {
  return {
    id,
    name: data.name || '',
    description: data.description || '',
    color: data.color || '#64748b',
    icon: data.icon || 'building',
    isActive: data.isActive !== false,
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt || new Date().toISOString(),
  };
}

export function useFirestoreDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, COLLECTION),
      orderBy('order', 'asc'),
      orderBy('name', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => docToDepartment(d.id, d.data()));
        setDepartments(items);
        setLoading(false);
      },
      (err) => {
        console.error('[useFirestoreDepartments]', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const createDepartment = useCallback(async (data: DepartmentFormData): Promise<string> => {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }, []);

  const updateDepartment = useCallback(async (id: string, data: Partial<DepartmentFormData>) => {
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const checkUsersInDepartment = useCallback(async (deptName: string): Promise<number> => {
    const q = query(
      collection(db, 'users'),
      where('department', '==', deptName),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.size;
  }, []);

  return {
    departments,
    loading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    checkUsersInDepartment,
  };
}
