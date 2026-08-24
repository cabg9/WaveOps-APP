// ═══════════════════════════════════════════════════════════════════
// HOOK: POSICIONES - CATALOGO DE CARGOS
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import type { Position } from '@/types/develops';

function timestampToISO(ts: Timestamp | Date | string | undefined | null): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof (ts as any).toDate === 'function') return (ts as Timestamp).toDate().toISOString();
  return new Date().toISOString();
}

const COLLECTION_NAME = 'positions';

export function useFirestorePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || '',
            level: typeof data.level === 'number' ? data.level : 7,
            department: data.department || null,
            isActive: data.isActive !== false,
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
            createdBy: data.createdBy || '',
          } as Position;
        });
        docs.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
        setPositions(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[useFirestorePositions] Error:', err);
        setError('Error cargando posiciones');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createPosition = useCallback(async (
    data: Omit<Position, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
  ): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        isActive: true,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('[useFirestorePositions] Error creando:', err);
      return null;
    }
  }, []);

  const updatePosition = useCallback(async (
    id: string,
    data: Partial<Omit<Position, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('[useFirestorePositions] Error actualizando:', err);
      return false;
    }
  }, []);

  const deletePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('[useFirestorePositions] Error eliminando:', err);
      return false;
    }
  }, []);

  return {
    positions,
    loading,
    error,
    createPosition,
    updatePosition,
    deletePosition,
  };
}
