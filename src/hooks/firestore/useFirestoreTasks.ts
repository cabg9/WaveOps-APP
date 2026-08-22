// ═══════════════════════════════════════════════════════════════════
// HOOK DE TAREAS FIRESTORE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  DocumentData,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { TaskStatus, TaskPriority, Note, Subtask } from '@/types';

// Normaliza códigos de departamento para comparaciones robustas
function normalizeDeptCode(name: string): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, '_').toUpperCase();
  const map: Record<string, string> = {
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'FINANCIERO': 'FINANCIERO',
    'VENTAS': 'VENTAS',
    'MARKETING': 'MARKETING',
    'DIVE_SHOP': 'DIVE_SHOP',
    'DIVE': 'DIVE_SHOP',
    'GUIADO_DE_BUCEO': 'GUIANZA',
    'GUIANZA': 'GUIANZA',
    'COCINA': 'COCINA',
    'MOVILIDAD': 'MOVILIDAD',
    'WAREHOUSE': 'WAREHOUSE',
    'VESSELS': 'VESSELS',
    'OPERACIONES': 'OPERACIONES',
  };
  return map[cleaned] || cleaned;
}

export interface FirestoreTask {
  id: string;
  title: string;
  description?: string;
  type: 'SPECIFIC' | 'EXTRA' | 'ROUTINE';
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string[];
  assignedToName?: string;
  department: string;
  dueDate: string;
  dueTime?: string;
  createdAt: string;
  createdBy: string;
  supervisorId?: string;
  requiresPhoto?: boolean;
  startTime?: string;
  estimatedMinutes?: number;
  shiftIds?: string[];
  supportUserIds?: string[];
  recurrence?: string;
  templateId?: string;
  source?: 'specific-task-template' | 'manual';
  notifyOnDelay?: string[];
  updatedAt?: string;
  notes?: Note[];
  subtasks?: Subtask[];
  photos?: string[];
  rating?: 'good' | 'bad';
  ratingNote?: string;
  blocked?: boolean;
  blockedReason?: string;
  blockedBy?: string;
  history?: {
    date: string;
    action: string;
    userId: string;
    userName?: string;
    note?: string;
  }[];
}

const COLLECTION_NAME = 'tasks';

export function useFirestoreTasks() {
  const [tasks, setTasks] = useState<FirestoreTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar tareas en tiempo real
  useEffect(() => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            // Convertir Timestamps a strings
            const rawHistory = docData.history || [];
            return {
              id: doc.id,
              ...docData,
              createdAt: docData.createdAt?.toDate?.() 
                ? docData.createdAt.toDate().toISOString() 
                : docData.createdAt || new Date().toISOString(),
              updatedAt: docData.updatedAt?.toDate?.() 
                ? docData.updatedAt.toDate().toISOString() 
                : docData.updatedAt,
              dueDate: docData.dueDate?.toDate?.() 
                ? docData.dueDate.toDate().toISOString() 
                : docData.dueDate || new Date().toISOString(),
              department: normalizeDeptCode(docData.department || ''),
              history: rawHistory.map((h: any) => ({
                id: h.id || Math.random().toString(36).substr(2, 9),
                performedBy: h.userId || h.performedBy || '',
                performedAt: h.date || h.performedAt || new Date().toISOString(),
                action: h.action || '',
                note: h.note || '',
              })),
            };
          }) as FirestoreTask[];
          setTasks(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error al cargar tareas:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error al inicializar tareas:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, []);

  // Obtener todas las tareas
  const getTasks = useCallback(async (): Promise<FirestoreTask[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreTask[];
    } catch (err: any) {
      console.error('Error al obtener tareas:', err);
      throw err;
    }
  }, []);

  // Obtener tareas por usuario
  const getTasksByUser = useCallback(async (userId: string): Promise<FirestoreTask[]> => {
    try {
      const { getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, COLLECTION_NAME),
        where('assignedTo', '==', userId),
        orderBy('dueDate', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreTask[];
    } catch (err: any) {
      console.error('Error al obtener tareas por usuario:', err);
      throw err;
    }
  }, []);

  // Obtener tareas por departamento
  const getTasksByDepartment = useCallback(async (department: string): Promise<FirestoreTask[]> => {
    try {
      const { getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreTask[];
    } catch (err: any) {
      console.error('Error al obtener tareas por departamento:', err);
      throw err;
    }
  }, []);

  // Crear tarea
  const createTask = useCallback(async (taskData: Omit<FirestoreTask, 'id'>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...taskData,
        createdAt: now,
        updatedAt: now,
        status: taskData.status || TaskStatus.PENDING,
        history: [
          {
            date: now,
            action: 'Tarea creada',
            userId: taskData.createdBy,
          }
        ],
      });
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear tarea:', err);
      throw err;
    }
  }, []);

  // Actualizar tarea
  const updateTask = useCallback(async (id: string, updates: Partial<FirestoreTask>, userId?: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: DocumentData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Si hay cambio de estado, agregar al historial
      if (updates.status && userId) {
        updateData.history = arrayUnion({
          date: new Date().toISOString(),
          action: `Estado cambiado a ${updates.status}`,
          userId,
        });
      }

      await updateDoc(docRef, updateData);
    } catch (err: any) {
      console.error('Error al actualizar tarea:', err);
      throw err;
    }
  }, []);

  // Cambiar estado de tarea
  const changeTaskStatus = useCallback(async (id: string, status: TaskStatus, userId: string, note?: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const historyEntry: any = {
        date: new Date().toISOString(),
        action: `Estado cambiado a ${status}`,
        userId,
      };
      if (note) historyEntry.note = note;
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString(),
        history: arrayUnion(historyEntry),
      });
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      throw err;
    }
  }, []);

  // Agregar nota
  const addNote = useCallback(async (taskId: string, content: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(docRef, {
        notes: arrayUnion({
          id: Date.now().toString(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: userId,
        }),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al agregar nota:', err);
      throw err;
    }
  }, []);

  // Agregar subtask
  const addSubtask = useCallback(async (taskId: string, title: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(docRef, {
        subtasks: arrayUnion({
          id: Date.now().toString(),
          title,
          completed: false,
        }),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al agregar subtask:', err);
      throw err;
    }
  }, []);

  // Toggle subtask
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string): Promise<void> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;

      const updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );

      const docRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(docRef, {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al toggle subtask:', err);
      throw err;
    }
  }, [tasks]);

  // Agregar foto
  const addPhoto = useCallback(async (taskId: string, photoUrl: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(docRef, {
        photos: arrayUnion(photoUrl),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error al agregar foto:', err);
      throw err;
    }
  }, []);

  // Verificar tarea
  const verifyTask = useCallback(async (id: string, userId: string): Promise<void> => {
    try {
      await changeTaskStatus(id, TaskStatus.VERIFIED, userId);
    } catch (err: any) {
      console.error('Error al verificar tarea:', err);
      throw err;
    }
  }, [changeTaskStatus]);

  // Calificar tarea
  const rateTask = useCallback(async (id: string, rating: 'good' | 'bad', note: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        rating,
        ratingNote: note,
        ratedBy: userId,
        ratedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: arrayUnion({
          date: new Date().toISOString(),
          action: `Tarea calificada como ${rating}`,
          userId,
          note,
        }),
      });
    } catch (err: any) {
      console.error('Error al calificar tarea:', err);
      throw err;
    }
  }, []);

  // Bloquear tarea
  const blockTask = useCallback(async (id: string, reason: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        blocked: true,
        blockedReason: reason,
        blockedBy: userId,
        updatedAt: new Date().toISOString(),
        history: arrayUnion({
          date: new Date().toISOString(),
          action: 'Tarea bloqueada',
          userId,
          note: reason,
        }),
      });
    } catch (err: any) {
      console.error('Error al bloquear tarea:', err);
      throw err;
    }
  }, []);

  // Desbloquear tarea
  const unblockTask = useCallback(async (id: string, note: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        blocked: false,
        updatedAt: new Date().toISOString(),
        history: arrayUnion({
          date: new Date().toISOString(),
          action: 'Tarea desbloqueada',
          userId,
          note,
        }),
      });
    } catch (err: any) {
      console.error('Error al desbloquear tarea:', err);
      throw err;
    }
  }, []);

  // Reabrir tarea
  const reopenTask = useCallback(async (id: string, userId: string): Promise<void> => {
    try {
      await changeTaskStatus(id, TaskStatus.PENDING, userId, 'Tarea reabierta');
    } catch (err: any) {
      console.error('Error al reabrir tarea:', err);
      throw err;
    }
  }, [changeTaskStatus]);

  // Eliminar tarea
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err: any) {
      console.error('Error al eliminar tarea:', err);
      throw err;
    }
  }, []);

  // Contadores
  const getTaskCounts = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      verified: tasks.filter(t => t.status === TaskStatus.VERIFIED).length,
      overdue: tasks.filter(t => {
        if (!t.dueDate) return false;
        return t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED;
      }).length,
    };
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    getTasks,
    getTasksByUser,
    getTasksByDepartment,
    createTask,
    updateTask,
    changeTaskStatus,
    addNote,
    addSubtask,
    toggleSubtask,
    addPhoto,
    verifyTask,
    rateTask,
    blockTask,
    unblockTask,
    reopenTask,
    deleteTask,
    getTaskCounts,
  };
}