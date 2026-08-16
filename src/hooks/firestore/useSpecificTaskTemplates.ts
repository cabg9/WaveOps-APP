// ═══════════════════════════════════════════════════════════════════
// HOOK DE PLANTILLAS DE TAREAS ESPECÍFICAS
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
  where,
  getDocs,
  writeBatch,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { SpecificTaskTemplate, TaskStatus } from '@/types';

const TEMPLATES_COLLECTION = 'specificTaskTemplates';
const TASKS_COLLECTION = 'tasks';

export interface CreateSpecificTaskTemplateData {
  title: string;
  description: string;
  department: string;
  shiftId: string;
  startTime: string;
  estimatedMinutes: number;
  priority: string;
  supervisorId: string;
  notifyOnDelay: string[];
  requiresPhoto: boolean;
  vigenciaDays: number | null;
  createdBy: string;
}

export function useSpecificTaskTemplates() {
  const [templates, setTemplates] = useState<SpecificTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar plantillas activas en tiempo real
  useEffect(() => {
    try {
      const q = query(
        collection(db, TEMPLATES_COLLECTION),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => {
            const docData = docSnap.data();
            return {
              id: docSnap.id,
              ...docData,
              createdAt: docData.createdAt?.toDate?.()?.toISOString?.() || docData.createdAt,
            };
          }) as unknown as SpecificTaskTemplate[];
          setTemplates(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error al cargar plantillas de tareas específicas:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error al inicializar plantillas:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, []);

  // Crear plantilla
  const createTemplate = useCallback(async (data: CreateSpecificTaskTemplateData): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
        ...data,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear plantilla de tarea específica:', err);
      throw err;
    }
  }, []);

  // Actualizar plantilla y tareas futuras pendientes
  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<CreateSpecificTaskTemplateData>,
    affectOnlyFuture: boolean = true
  ): Promise<void> => {
    try {
      const templateRef = doc(db, TEMPLATES_COLLECTION, id);
      await updateDoc(templateRef, { ...updates, updatedAt: new Date().toISOString() } as DocumentData);

      if (affectOnlyFuture) {
        const today = new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, TASKS_COLLECTION),
          where('templateId', '==', id),
          where('status', 'in', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]),
          where('dueDate', '>=', today)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach((taskDoc) => {
          const updateData: DocumentData = {};
          if (updates.title !== undefined) updateData.title = updates.title;
          if (updates.description !== undefined) updateData.description = updates.description;
          if (updates.priority !== undefined) updateData.priority = updates.priority;
          if (updates.startTime !== undefined && updates.estimatedMinutes !== undefined) {
            updateData.startTime = updates.startTime;
            updateData.dueTime = calculateDueTime(updates.startTime, updates.estimatedMinutes);
          } else if (updates.startTime !== undefined) {
            const currentTask = taskDoc.data();
            updateData.startTime = updates.startTime;
            updateData.dueTime = calculateDueTime(updates.startTime, currentTask.estimatedMinutes || 0);
          } else if (updates.estimatedMinutes !== undefined) {
            const currentTask = taskDoc.data();
            updateData.estimatedMinutes = updates.estimatedMinutes;
            updateData.dueTime = calculateDueTime(currentTask.startTime || '00:00', updates.estimatedMinutes);
          }
          if (updates.supervisorId !== undefined) updateData.supervisorId = updates.supervisorId;
          if (updates.requiresPhoto !== undefined) updateData.requiresPhoto = updates.requiresPhoto;
          if (updates.notifyOnDelay !== undefined) updateData.notifyOnDelay = updates.notifyOnDelay;
          updateData.updatedAt = new Date().toISOString();
          batch.update(taskDoc.ref, updateData);
        });

        await batch.commit();
      }
    } catch (err: any) {
      console.error('Error al actualizar plantilla de tarea específica:', err);
      throw err;
    }
  }, []);

  // Eliminar plantilla y tareas futuras pendientes
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    try {
      const templateRef = doc(db, TEMPLATES_COLLECTION, id);
      await updateDoc(templateRef, { isActive: false, deletedAt: new Date().toISOString() });

      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, TASKS_COLLECTION),
        where('templateId', '==', id),
        where('status', 'in', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]),
        where('dueDate', '>=', today)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((taskDoc) => {
        batch.delete(taskDoc.ref);
      });
      await batch.commit();
    } catch (err: any) {
      console.error('Error al eliminar plantilla de tarea específica:', err);
      throw err;
    }
  }, []);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Helper para calcular dueTime a partir de startTime + minutos
function calculateDueTime(startTime: string, estimatedMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + estimatedMinutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
