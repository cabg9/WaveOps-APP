import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, where,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import type { Department, DepartmentFormData } from '@/types/department';

const COLLECTION = 'departments';

function docToDepartment(id: string, data: any): Department {
  return {
    id,
    code: data.code || data.name?.toUpperCase().replace(/ /g, '_') || id,
    name: data.name || '',
    description: data.description || '',
    color: data.color || '#64748b',
    icon: data.icon || 'building',
    isActive: data.isActive !== false,
    parentId: data.parentId || null,
    type: data.type || 'otro',
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
      code: data.code || data.name?.toUpperCase().replace(/ /g, '_'),
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }, []);

  const updateDepartment = useCallback(async (id: string, data: Partial<DepartmentFormData>): Promise<void> => {
    const currentDoc = await getDoc(doc(db, COLLECTION, id));
    const currentData = currentDoc.data();
    if (currentData && !currentData.code) {
      const fallbackCode = (currentData.name || id).toUpperCase().replace(/ /g, '_');
      await updateDoc(doc(db, COLLECTION, id), {
        code: fallbackCode,
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const checkUsersInDepartment = useCallback(async (deptCode: string): Promise<number> => {
    const q = query(
      collection(db, 'users'),
      where('department', '==', deptCode),
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
