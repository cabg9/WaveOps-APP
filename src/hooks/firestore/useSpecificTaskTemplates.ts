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
const TASKS_COLLECTION = 'tasks';

export interface CreateSpecificTaskTemplateData {
  title: string;
  description: string;
  department: string;
  shiftId?: string;
  shiftIds?: string[];
  startTime: string;
  estimatedMinutes: number;
  priority: string;
  supervisorId: string;
  notifyOnDelay: string[];
  requiresPhoto: boolean;
  vigenciaDays: number | null;
  subtasks?: { id: string; title: string; completed: boolean }[];
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
      const payload: any = {
        ...data,
        department: normalizeDeptCode(data.department),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      // Normalizar a shiftIds si viene shiftId legacy
      if (data.shiftId && !data.shiftIds) {
        payload.shiftIds = [data.shiftId];
      }
      delete payload.shiftId;
      const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), payload);
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
      const normalizedUpdates: any = { ...updates };
      if (normalizedUpdates.department) {
        normalizedUpdates.department = normalizeDeptCode(normalizedUpdates.department);
      }
      await updateDoc(templateRef, { ...normalizedUpdates, updatedAt: new Date().toISOString() } as DocumentData);

      if (affectOnlyFuture) {
        const today = new Date().toISOString().split('T')[0];
        // Consulta simple por templateId y se filtra en memoria para evitar índices compuestos
        const q = query(
          collection(db, TASKS_COLLECTION),
          where('templateId', '==', id)
        );
        const snapshot = await getDocs(q);
        const eligibleStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED];
        const batch = writeBatch(db);

        snapshot.docs.forEach((taskDoc) => {
          const taskData = taskDoc.data();
          // Filtrar en memoria: solo futuras y con estado editable
          if (taskData.dueDate < today) return;
          if (!eligibleStatuses.includes(taskData.status)) return;

          const updateData: DocumentData = {};
          if (updates.title !== undefined) updateData.title = updates.title;
          if (updates.description !== undefined) updateData.description = updates.description;
          if (updates.priority !== undefined) updateData.priority = updates.priority;
          if (updates.startTime !== undefined && updates.estimatedMinutes !== undefined) {
            updateData.startTime = updates.startTime;
            updateData.dueTime = calculateDueTime(updates.startTime, updates.estimatedMinutes);
          } else if (updates.startTime !== undefined) {
            updateData.startTime = updates.startTime;
            updateData.dueTime = calculateDueTime(updates.startTime, taskData.estimatedMinutes || 0);
          } else if (updates.estimatedMinutes !== undefined) {
            updateData.estimatedMinutes = updates.estimatedMinutes;
            updateData.dueTime = calculateDueTime(taskData.startTime || '00:00', updates.estimatedMinutes);
          }
          if (updates.supervisorId !== undefined) updateData.supervisorId = updates.supervisorId;
          if (updates.requiresPhoto !== undefined) updateData.requiresPhoto = updates.requiresPhoto;
          if (updates.notifyOnDelay !== undefined) updateData.notifyOnDelay = updates.notifyOnDelay;
          if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks;
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
      // Consulta simple por templateId y se filtra en memoria para evitar índices compuestos
      const q = query(
        collection(db, TASKS_COLLECTION),
        where('templateId', '==', id)
      );
      const snapshot = await getDocs(q);
      const eligibleStatuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED];
      const batch = writeBatch(db);
      snapshot.docs.forEach((taskDoc) => {
        const taskData = taskDoc.data();
        // Filtrar en memoria: solo futuras y con estado editable
        if (taskData.dueDate >= today && eligibleStatuses.includes(taskData.status)) {
          batch.delete(taskDoc.ref);
        }
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
