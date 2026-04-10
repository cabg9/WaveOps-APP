// ═══════════════════════════════════════════════════════════════════
// HOOK DE TURNOS FIRESTORE - GALAPAGOS TASKS
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
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Department, AssignmentStatus } from '@/types';

export interface FirestoreShift {
  id: string;
  name: string;
  department: Department;
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
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

const SHIFTS_COLLECTION = 'shifts';
const ASSIGNMENTS_COLLECTION = 'assignments';

export function useFirestoreShifts() {
  const [shifts, setShifts] = useState<FirestoreShift[]>([]);
  const [assignments, setAssignments] = useState<FirestoreAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar turnos en tiempo real
  useEffect(() => {
    try {
      const q = query(
        collection(db, SHIFTS_COLLECTION),
        where('isActive', '==', true),
        orderBy('startTime', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as FirestoreShift[];
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
        (snapshot) =>        {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as FirestoreAssignment[];
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
  const getShiftsByDepartment = useCallback((department: Department): FirestoreShift[] => {
    return shifts.filter(s => s.department === department && s.isActive);
  }, [shifts]);

  // Obtener turno por ID
  const getShiftById = useCallback((id: string): FirestoreShift | undefined => {
    return shifts.find(s => s.id === id);
  }, [shifts]);

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
  const getWeekAssignments = useCallback((department: Department | 'ALL', weekStart: Date): FirestoreAssignment[] => {
    const startStr = weekStart.toISOString().split('T')[0];
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);
    const endStr = endDate.toISOString().split('T')[0];

    return assignments.filter(a => {
      const shift = getShiftById(a.shiftId);
      if (!shift) return false;
      if (department !== 'ALL' && shift.department !== department) return false;
      return a.date >= startStr && a.date <= endStr;
    });
  }, [assignments, getShiftById]);

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

  // Remover turno
  const removeShift = useCallback(async (assignmentId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, assignmentId));
    } catch (err: any) {
      console.error('Error al remover turno:', err);
      throw err;
    }
  }, []);

  // Publicar asignaciones
  const publishAssignments = useCallback(async (department: Department | 'ALL', weekStart: Date, publishedBy: string): Promise<void> => {
    try {
      const weekAssignments = getWeekAssignments(department, weekStart);
      const borradorAssignments = weekAssignments.filter(a => a.status === AssignmentStatus.BORRADOR);

      for (const assignment of borradorAssignments) {
        const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignment.id);
        await updateDoc(docRef, {
          status: AssignmentStatus.PUBLICADO,
          publishedAt: new Date().toISOString(),
          publishedBy,
        });
      }
    } catch (err: any) {
      console.error('Error al publicar asignaciones:', err);
      throw err;
    }
  }, [getWeekAssignments]);

  // Contar borradores
  const getBorradorCount = useCallback((department: Department | 'ALL', weekStart: Date): number => {
    const weekAssignments = getWeekAssignments(department, weekStart);
    return weekAssignments.filter(a => a.status === AssignmentStatus.BORRADOR).length;
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
    publishAssignments,
    getBorradorCount,
    createShift,
    updateShift,
    deleteShift,
  };
}
