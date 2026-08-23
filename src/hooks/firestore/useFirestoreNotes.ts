// ═══════════════════════════════════════════════════════════════════
// HOOK DE NOTAS / RECORDATORIOS - FIRESTORE REALTIME
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase-config';

export interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
}

export type NoteStatus = 'active' | 'converted' | 'archived';

export interface FirestoreNote {
  id: string;
  userId: string;
  title: string;
  items: NoteItem[];
  status: NoteStatus;
  convertedToTaskId?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

const COLLECTION_NAME = 'notes';

function timestampToISO(ts: Timestamp | Date | string | undefined | null): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof (ts as any).toDate === 'function') return (ts as Timestamp).toDate().toISOString();
  return new Date().toISOString();
}

export function useFirestoreNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<FirestoreNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime listener
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId || '',
            title: data.title || '',
            items: (data.items || []).map((item: any) => ({
              id: item.id || Date.now().toString(),
              text: item.text || '',
              completed: !!item.completed,
            })),
            status: data.status || 'active',
            convertedToTaskId: data.convertedToTaskId || null,
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
          } as FirestoreNote;
        });
        setNotes(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error al escuchar notas:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const createNote = useCallback(async (title: string, items: NoteItem[]): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        userId,
        title: title.trim() || 'Sin título',
        items: items.length > 0 ? items : [],
        status: 'active',
        convertedToTaskId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as DocumentData);
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear nota:', err);
      throw err;
    }
  }, [userId]);

  const updateNote = useCallback(async (id: string, updates: Partial<FirestoreNote>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: DocumentData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, updateData);
    } catch (err: any) {
      console.error('Error al actualizar nota:', err);
      throw err;
    }
  }, []);

  const toggleNoteItem = useCallback(async (id: string, itemId: string): Promise<void> => {
    try {
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      const updatedItems = note.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al alternar item:', err);
      throw err;
    }
  }, [notes]);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'archived',
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al archivar nota:', err);
      throw err;
    }
  }, []);

  const markNoteConverted = useCallback(async (id: string, taskId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'converted',
        convertedToTaskId: taskId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al marcar nota convertida:', err);
      throw err;
    }
  }, []);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    toggleNoteItem,
    deleteNote,
    markNoteConverted,
  };
}
