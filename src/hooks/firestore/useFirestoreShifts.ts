// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS FIRESTORE - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getDocs,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { AssignmentStatus, TaskStatus, TaskPriority } from '@/types';

export interface FirestoreShift {
  id: string;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
}

export interface FirestoreAssignment {
  id: string;
  shiftId: string;
  userId: string;
  userName?: string;
  date: string;
  status: AssignmentStatus;
  previousStatus?: AssignmentStatus; // Estado previo antes de marcar como ELIMINADO
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

const SHIFTS_COLLECTION = 'shifts';
const ASSIGNMENTS_COLLECTION = 'assignments';

// Convertir Date a yyyy-MM-dd usando hora LOCAL (no UTC)
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useFirestoreShifts() {
  const [shifts, setShifts] = useState<FirestoreShift[]>([]);
  const allShifts = shifts;
  const [assignments, setAssignments] = useState<FirestoreAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar turnos en tiempo real (sin filtro compuesto para evitar índice)
  useEffect(() => {
    try {
      // Consulta simple sin orderBy compuesto
      const q = query(collection(db, SHIFTS_COLLECTION));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const rawData = snapshot.docs.map(doc => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
              createdAt: docData.createdAt?.toDate?.() 
                ? docData.createdAt.toDate().toISOString() 
                : docData.createdAt,
            };
          }) as unknown as FirestoreShift[];
          const data = rawData
            .filter(s => s.isActive !== false && s.startTime)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
          setShifts(data);
        },
        (err) => {
          console.error('Error al cargar turnos:', err);
          setError(err.message);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error al inicializar turnos:', err);
      setError(err.message);
      return () => {};
    }
  }, []);

  // Escuchar asignaciones en tiempo real
  useEffect(() => {
    try {
      const q = query(
        collection(db, ASSIGNMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
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
              publishedAt: docData.publishedAt?.toDate?.() 
                ? docData.publishedAt.toDate().toISOString() 
                : docData.publishedAt,
            };
          }) as unknown as FirestoreAssignment[];
          setAssignments(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error al cargar asignaciones:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error al inicializar asignaciones:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, []);


  // Obtener turnos por departamento
  const getShiftsByDepartment = useCallback((department: string) => {
    return allShifts.filter(s => s.department === department);
  }, [allShifts]);
  // Obtener turno por ID
  const getShiftById = useCallback((id: string): any => {
    return allShifts.find(s => s.id === id);
  }, [allShifts]);

  // Obtener turnos de un usuario en una fecha
  const getUserShifts = useCallback((userId: string, date: string): FirestoreShift[] => {
    const userAssignments = assignments.filter(
      a => a.userId === userId && a.date === date && a.status !== AssignmentStatus.ELIMINADO
    );
    return userAssignments
      .map(a => getShiftById(a.shiftId))
      .filter((s): s is FirestoreShift => s !== undefined)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [assignments, getShiftById]);

  // Obtener asignaciones de una semana
  const getWeekAssignments = useCallback((department: string | 'ALL', weekStart: Date): FirestoreAssignment[] => {
    const startStr = toLocalISODate(weekStart);
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);
    const endStr = toLocalISODate(endDate);

    return assignments.filter(a => {
      return a.date >= startStr && a.date <= endStr;
    });
  }, [assignments]);

  // Asignar turno
  const assignShift = useCallback(async (userId: string, shiftId: string, date: string, assignedBy: string): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
        shiftId,
        userId,
        date,
        status: AssignmentStatus.BORRADOR,
        createdAt: new Date().toISOString(),
        createdBy: assignedBy,
      });
      return docRef.id;
    } catch (err: any) {
      console.error('Error al asignar turno:', err);
      throw err;
    }
  }, []);

  // Remover turno (soft-delete: marca como ELIMINADO para que el asignador vea el cambio antes de publicar)
  const removeShift = useCallback(async (assignmentId: string): Promise<void> => {
    try {
      const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
      const assignment = assignments.find(a => a.id === assignmentId);
      await updateDoc(docRef, {
        status: AssignmentStatus.ELIMINADO,
        previousStatus: assignment?.status || AssignmentStatus.BORRADOR,
      });
    } catch (err: any) {
      console.error('Error al remover turno:', err);
      throw err;
    }
  }, [assignments]);

  // Restaurar turno marcado como ELIMINADO (deshacer la eliminación antes de publicar)
  const restoreShift = useCallback(async (assignmentId: string): Promise<void> => {
    try {
      const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
      const assignment = assignments.find(a => a.id === assignmentId);
      await updateDoc(docRef, {
        status: assignment?.previousStatus || AssignmentStatus.BORRADOR,
        previousStatus: null,
      });
    } catch (err: any) {
      console.error('Error al restaurar turno:', err);
      throw err;
    }
  }, [assignments]);

  // Publicar asignaciones: publica borradores, elimina definitivamente los marcados como ELIMINADO
  // y genera tareas específicas vinculadas a los turnos publicados.
  const publishAssignments = useCallback(async (department: string | 'ALL', weekStart: Date, publishedBy: string): Promise<void> => {
    try {
      const weekAssignments = getWeekAssignments(department, weekStart);
      const borradorAssignments = weekAssignments.filter(a => a.status === AssignmentStatus.BORRADOR);
      const eliminadoAssignments = weekAssignments.filter(a => a.status === AssignmentStatus.ELIMINADO);

      for (const assignment of borradorAssignments) {
        const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignment.id);
        await updateDoc(docRef, {
          status: AssignmentStatus.PUBLICADO,
          publishedAt: new Date().toISOString(),
          publishedBy,
        });
      }

      for (const assignment of eliminadoAssignments) {
        await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, assignment.id));
      }

      // Generar tareas específicas para las asignaciones publicadas
      await generateSpecificTasksFromAssignments(borradorAssignments);
    } catch (err: any) {
      console.error('Error al publicar asignaciones:', err);
      throw err;
    }
  }, [getWeekAssignments]);

  // Generar tareas específicas a partir de asignaciones publicadas
  const generateSpecificTasksFromAssignments = useCallback(async (assignments: FirestoreAssignment[]): Promise<void> => {
    if (assignments.length === 0) return;

    const shiftIds = [...new Set(assignments.map(a => a.shiftId))];
    if (shiftIds.length === 0) return;

    try {
      // Consultar todas las plantillas activas y filtrar en memoria por turno.
      // Se evita el índice compuesto shiftId+isActive y se respeta el límite de 10 de 'in'.
      const templatesQuery = query(
        collection(db, 'specificTaskTemplates'),
        where('isActive', '==', true)
      );
      const templatesSnapshot = await getDocs(templatesQuery);
      const templates = templatesSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((t: any) => {
          const templateShiftIds = t.shiftIds || (t.shiftId ? [t.shiftId] : []);
          return templateShiftIds.some((sid: string) => shiftIds.includes(sid));
        });

      if (templates.length === 0) return;

      const now = new Date().toISOString();
      const today = now.split('T')[0];

      for (const template of templates) {
        const templateShiftIds = template.shiftIds || (template.shiftId ? [template.shiftId] : []);
        const templateAssignments = assignments.filter(a => templateShiftIds.includes(a.shiftId));
        if (templateAssignments.length === 0) continue;

        // Agrupar asignaciones de los turnos de la plantilla por fecha
        const byDate = new Map<string, FirestoreAssignment[]>();
        for (const assignment of templateAssignments) {
          if (!byDate.has(assignment.date)) byDate.set(assignment.date, []);
          byDate.get(assignment.date)!.push(assignment);
        }

        for (const [date, dateAssignments] of byDate.entries()) {
          // Verificar vigencia de la plantilla
          if (!isTemplateWithinVigency(template, date)) continue;

          const assignedTo = [...new Set(dateAssignments.map(a => a.userId))];
          const assignedShiftIds = [...new Set(dateAssignments.map(a => a.shiftId))];

          // Evitar duplicados: buscar si ya existe una tarea para este template + fecha
          const existingQuery = query(
            collection(db, 'tasks'),
            where('templateId', '==', template.id)
          );
          const existingSnapshot = await getDocs(existingQuery);
          const existingDoc = existingSnapshot.docs.find((d) => {
            const data = d.data();
            return data.dueDate === date && data.source === 'specific-task-template';
          });

          if (!existingDoc) {
            // Crear nueva tarea compartida
            await addDoc(collection(db, 'tasks'), {
              title: template.title || '',
              description: template.description || '',
              type: 'SPECIFIC',
              status: TaskStatus.PENDING,
              priority: template.priority || TaskPriority.MEDIUM,
              assignedTo,
              supervisorId: template.supervisorId || '',
              notifyOnDelay: template.notifyOnDelay || [],
              department: template.department || '',
              dueDate: date,
              startTime: template.startTime || '',
              dueTime: calculateDueTime(template.startTime || '00:00', template.estimatedMinutes || 0),
              estimatedMinutes: template.estimatedMinutes || 0,
              requiresPhoto: template.requiresPhoto || false,
              shiftIds: assignedShiftIds,
              templateId: template.id,
              source: 'specific-task-template',
              createdBy: template.createdBy || '',
              createdAt: now,
              updatedAt: now,
              history: [
                {
                  date: now,
                  action: 'Tarea creada automáticamente desde asignación de turno',
                  userId: template.createdBy || '',
                }
              ],
            });
          } else {
            // Actualizar asignados y turnos de la tarea existente
            const existingData = existingDoc.data();
            const currentAssignedTo = existingData.assignedTo || [];
            const newAssignedTo = [...new Set([...currentAssignedTo, ...assignedTo])];
            const currentShiftIds = existingData.shiftIds || [];
            const newShiftIds = [...new Set([...currentShiftIds, ...assignedShiftIds])];
            const hasChanges = newAssignedTo.length !== currentAssignedTo.length || newShiftIds.length !== currentShiftIds.length;
            if (hasChanges) {
              await updateDoc(existingDoc.ref, {
                assignedTo: newAssignedTo,
                shiftIds: newShiftIds,
                updatedAt: now,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error al generar tareas específicas:', err);
      // No lanzamos el error para no bloquear la publicación de asignaciones
    }
  }, []);

  // Eliminar tareas específicas pendientes asociadas a una asignación eliminada
  const cleanupSpecificTasksForRemovedAssignment = useCallback(async (assignment: FirestoreAssignment): Promise<void> => {
    try {
      if (!assignment.shiftId || !assignment.date || !assignment.userId) return;

      // Consulta simple por shiftId y se filtra en memoria para evitar índices compuestos
      const q = query(
        collection(db, 'tasks'),
        where('shiftIds', 'array-contains', assignment.shiftId)
      );
      const snapshot = await getDocs(q);

      for (const taskDoc of snapshot.docs) {
        const taskData = taskDoc.data();
        // Filtrar en memoria: solo tareas de esta fecha, pendientes y generadas desde plantilla
        if (taskData.dueDate !== assignment.date) continue;
        if (taskData.status !== TaskStatus.PENDING) continue;
        if (taskData.source !== 'specific-task-template') continue;

        const assignedTo = (taskData.assignedTo || []).filter((id: string) => id !== assignment.userId);
        if (assignedTo.length === 0) {
          await deleteDoc(taskDoc.ref);
        } else {
          await updateDoc(taskDoc.ref, { assignedTo, updatedAt: new Date().toISOString() });
        }
      }
    } catch (err: any) {
      console.error('Error al limpiar tareas específicas:', err);
    }
  }, []);

  // Contar borradores
  const getBorradorCount = useCallback((department: string | 'ALL', weekStart: Date): number => {
    const weekAssignments = getWeekAssignments(department, weekStart);
    return weekAssignments.filter(a => a.status === AssignmentStatus.BORRADOR).length;
  }, [getWeekAssignments]);

  // Contar cambios pendientes (borradores + eliminaciones no publicadas)
  const getPendingChangesCount = useCallback((department: string | 'ALL', weekStart: Date): number => {
    const weekAssignments = getWeekAssignments(department, weekStart);
    return weekAssignments.filter(a => a.status === AssignmentStatus.BORRADOR || a.status === AssignmentStatus.ELIMINADO).length;
  }, [getWeekAssignments]);

  // Crear turno
  const createShift = useCallback(async (shiftData: Omit<FirestoreShift, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, SHIFTS_COLLECTION), {
        ...shiftData,
        isActive: true,
      });
      return docRef.id;
    } catch (err: any) {
      console.error('Error al crear turno:', err);
      throw err;
    }
  }, []);

  // Actualizar turno
  const updateShift = useCallback(async (id: string, updates: Partial<FirestoreShift>): Promise<void> => {
    try {
      const docRef = doc(db, SHIFTS_COLLECTION, id);
      await updateDoc(docRef, updates as DocumentData);
    } catch (err: any) {
      console.error('Error al actualizar turno:', err);
      throw err;
    }
  }, []);

  // Eliminar turno (soft delete)
  const deleteShift = useCallback(async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, SHIFTS_COLLECTION, id);
      await updateDoc(docRef, { isActive: false });
    } catch (err: any) {
      console.error('Error al eliminar turno:', err);
      throw err;
    }
  }, []);

  return {
    shifts,
    assignments,
    loading,
    error,
    getShiftsByDepartment,
    getShiftById,
    getUserShifts,
    getWeekAssignments,
    assignShift,
    removeShift,
    restoreShift,
    publishAssignments,
    cleanupSpecificTasksForRemovedAssignment,
    getBorradorCount,
    getPendingChangesCount,
    createShift,
    updateShift,
    deleteShift,
  };
}

// Helper: calcular hora límite a partir de hora de inicio + minutos estimados
function calculateDueTime(startTime: string, estimatedMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + estimatedMinutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Helper: verificar si una fecha está dentro de la vigencia de una plantilla
function isTemplateWithinVigency(template: any, dateStr: string): boolean {
  if (template.vigenciaDays === null || template.vigenciaDays === undefined || template.vigenciaDays <= 0) {
    return true; // Indefinido
  }
  const createdAt = template.createdAt?.toDate ? template.createdAt.toDate() : new Date(template.createdAt);
  const targetDate = new Date(dateStr + 'T00:00:00');
  const diffTime = targetDate.getTime() - createdAt.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= template.vigenciaDays;
}
