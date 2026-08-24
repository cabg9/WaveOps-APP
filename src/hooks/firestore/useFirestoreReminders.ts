// ═══════════════════════════════════════════════════════════════════
// HOOK DE RECORDATORIOS - FIRESTORE REALTIME
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/firebase-config';

export interface ReminderItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ReminderHistoryEntry {
  id: string;
  action: string;
  by: string; // userId
  byName?: string;
  at: string; // ISO
  note?: string;
}

export type ReminderStatus = 'active' | 'converted' | 'archived';
export type ReminderPriority = 'none' | 'low' | 'medium' | 'high';

export interface FirestoreReminder {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  url?: string;
  items: ReminderItem[];
  hasDate: boolean;
  hasTime: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  isUrgent: boolean;
  list: string;
  tags: string[];
  flagged: boolean;
  priority: ReminderPriority;
  location?: string;
  imageUrl?: string;
  status: ReminderStatus;
  convertedToTaskId?: string | null;
  history: ReminderHistoryEntry[];
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

function parseHistory(raw: any[]): ReminderHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((h: any) => ({
    id: h.id || Math.random().toString(36).substr(2, 9),
    action: h.action || '',
    by: h.by || h.userId || h.performedBy || '',
    byName: h.byName || h.userName || '',
    at: h.at || h.date || h.performedAt || new Date().toISOString(),
    note: h.note || '',
  }));
}

export function useFirestoreReminders(userId: string | undefined) {
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime listener
  useEffect(() => {
    if (!userId) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId || '',
            title: data.title || '',
            notes: data.notes || '',
            url: data.url || '',
            items: (data.items || []).map((item: any) => ({
              id: item.id || Date.now().toString(),
              text: item.text || '',
              completed: !!item.completed,
            })),
            hasDate: !!data.hasDate,
            hasTime: !!data.hasTime,
            dueDate: data.dueDate || '',
            dueTime: data.dueTime || '',
            isUrgent: !!data.isUrgent,
            list: data.list || 'Personal',
            tags: Array.isArray(data.tags) ? data.tags : [],
            flagged: !!data.flagged,
            priority: data.priority || 'none',
            location: data.location || '',
            imageUrl: data.imageUrl || '',
            status: data.status || 'active',
            convertedToTaskId: data.convertedToTaskId || null,
            history: parseHistory(data.history),
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
          } as FirestoreReminder;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setReminders(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error al escuchar recordatorios:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const createReminder = useCallback(async (reminder: Partial<FirestoreReminder>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        userId,
        title: reminder.title?.trim() || 'Sin título',
        notes: reminder.notes?.trim() || '',
        url: reminder.url?.trim() || '',
        items: reminder.items && reminder.items.length > 0 ? reminder.items : [],
        hasDate: !!reminder.hasDate,
        hasTime: !!reminder.hasTime,
        dueDate: reminder.dueDate || '',
        dueTime: reminder.dueTime || '',
        isUrgent: !!reminder.isUrgent,
        list: reminder.list?.trim() || 'Personal',
        tags: Array.isArray(reminder.tags) ? reminder.tags : [],
        flagged: !!reminder.flagged,
        priority: reminder.priority || 'none',
        location: reminder.location?.trim() || '',
        imageUrl: reminder.imageUrl?.trim() || '',
        status: 'active',
        convertedToTaskId: null,
        history: [
          {
            id: Math.random().toString(36).substr(2, 9),
            action: 'Recordatorio creado',
            by: userId,
            at: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      } as DocumentData);
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear recordatorio:', err);
      throw err;
    }
  }, [userId]);

  const updateReminder = useCallback(async (id: string, updates: Partial<FirestoreReminder>, actor?: { userId: string; userName?: string }): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: DocumentData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (actor?.userId) {
        updateData.history = arrayUnion({
          id: Math.random().toString(36).substr(2, 9),
          action: 'Recordatorio editado',
          by: actor.userId,
          byName: actor.userName || '',
          at: new Date().toISOString(),
        });
      }
      await updateDoc(docRef, updateData);
    } catch (err: any) {
      console.error('Error al actualizar recordatorio:', err);
      throw err;
    }
  }, []);

  const toggleReminderItem = useCallback(async (id: string, itemId: string): Promise<void> => {
    try {
      const reminder = reminders.find((r) => r.id === id);
      if (!reminder) return;

      const updatedItems = reminder.items.map((item) =>
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
  }, [reminders]);

  const archiveReminder = useCallback(async (id: string, actor?: { userId: string; userName?: string; note?: string }): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        action: 'Recordatorio eliminado',
        by: actor?.userId || userId,
        byName: actor?.userName || '',
        at: new Date().toISOString(),
        note: actor?.note || '',
      };
      await updateDoc(docRef, {
        status: 'archived',
        history: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al archivar recordatorio:', err);
      throw err;
    }
  }, [userId]);

  const markReminderConverted = useCallback(async (id: string, taskId: string, actor?: { userId: string; userName?: string }): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'converted',
        convertedToTaskId: taskId,
        history: arrayUnion({
          id: Math.random().toString(36).substr(2, 9),
          action: 'Convertido en tarea',
          by: actor?.userId || userId,
          byName: actor?.userName || '',
          at: new Date().toISOString(),
          note: `Tarea: ${taskId}`,
        }),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al marcar recordatorio convertido:', err);
      throw err;
    }
  }, [userId]);

  const getReminderById = useCallback(async (id: string): Promise<FirestoreReminder | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        userId: data.userId || '',
        title: data.title || '',
        notes: data.notes || '',
        url: data.url || '',
        items: (data.items || []).map((item: any) => ({
          id: item.id || Date.now().toString(),
          text: item.text || '',
          completed: !!item.completed,
        })),
        hasDate: !!data.hasDate,
        hasTime: !!data.hasTime,
        dueDate: data.dueDate || '',
        dueTime: data.dueTime || '',
        isUrgent: !!data.isUrgent,
        list: data.list || 'Personal',
        tags: Array.isArray(data.tags) ? data.tags : [],
        flagged: !!data.flagged,
        priority: data.priority || 'none',
        location: data.location || '',
        imageUrl: data.imageUrl || '',
        status: data.status || 'active',
        convertedToTaskId: data.convertedToTaskId || null,
        history: parseHistory(data.history),
        createdAt: timestampToISO(data.createdAt),
        updatedAt: timestampToISO(data.updatedAt),
      } as FirestoreReminder;
    } catch (err: any) {
      console.error('Error al obtener recordatorio:', err);
      throw err;
    }
  }, []);

  const renameList = useCallback(async (oldName: string, newName: string): Promise<number> => {
    try {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return 0;
      const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId), where('list', '==', oldName));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return 0;
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, {
          list: trimmed,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      return snapshot.docs.length;
    } catch (err: any) {
      console.error('Error al renombrar lista:', err);
      throw err;
    }
  }, [userId]);

  return {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    toggleReminderItem,
    archiveReminder,
    markReminderConverted,
    getReminderById,
    renameList,
  };
}
