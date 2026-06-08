// ═══════════════════════════════════════════════════════════════════
// HOOK DE INCIDENCIAS - FIRESTORE REALTIME
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase-config';
import { Incidencia, IncidenciaStatus, TaskPriority, Department } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

function timestampToISO(ts: Timestamp | Date | string | undefined | null): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof (ts as any).toDate === 'function') return (ts as Timestamp).toDate().toISOString();
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useFirestoreIncidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectionRef = collection(db, 'incidencias');

  // Realtime listener
  useEffect(() => {
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            status: data.status || IncidenciaStatus.NEW,
            priority: data.priority || TaskPriority.MEDIUM,
            reportedBy: data.reportedBy || '',
            reportedFor: data.reportedFor || undefined,
            targetDepartment: data.targetDepartment || Department.DIVE_SHOP,
            confirmedBy: data.confirmedBy || undefined,
            confirmedAt: data.confirmedAt ? timestampToISO(data.confirmedAt) : undefined,
            verifiedByList: data.verifiedByList || [],
            viewers: data.viewers || [],
            targetDepartments: data.targetDepartments || [data.targetDepartment],
            resolvedBy: data.resolvedBy || undefined,
            resolvedAt: data.resolvedAt ? timestampToISO(data.resolvedAt) : undefined,
            closedBy: data.closedBy || undefined,
            closedAt: data.closedAt ? timestampToISO(data.closedAt) : undefined,
            reopenedBy: data.reopenedBy || undefined,
            reopenedAt: data.reopenedAt ? timestampToISO(data.reopenedAt) : undefined,
            reopenReason: data.reopenReason || undefined,
            notes: (data.notes || []).map((n: any) => ({
              id: n.id || Date.now().toString(),
              content: n.content || '',
              createdBy: n.createdBy || '',
              createdAt: timestampToISO(n.createdAt),
            })),
            history: (data.history || []).map((h: any) => ({
              id: h.id || Date.now().toString(),
              action: h.action || '',
              performedBy: h.performedBy || '',
              performedAt: timestampToISO(h.performedAt),
              note: h.note || undefined,
            })),
            createdAt: timestampToISO(data.createdAt),
          } as Incidencia;
        });
        setIncidencias(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to incidencias:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear incidencia
  const createIncidencia = useCallback(
    async (data: {
      title: string;
      description: string;
      priority?: TaskPriority;
      reportedBy: string;
      targetDepartment: Department;
      targetDepartments?: Department[];
    }) => {
      const docRef = await addDoc(collectionRef, {
        title: data.title,
        description: data.description,
        status: IncidenciaStatus.NEW,
        priority: data.priority || TaskPriority.MEDIUM,
        reportedBy: data.reportedBy,
        targetDepartment: data.targetDepartment,
        targetDepartments: data.targetDepartments || [data.targetDepartment],
        notes: [],
        history: [
          {
            id: Date.now().toString(),
            action: 'Incidencia creada',
            performedBy: data.reportedBy,
            performedAt: new Date().toISOString(),
          },
        ],
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    []
  );

  // Verificar incidencia (NEW/OPEN/REOPENED -> VERIFIED)
  const confirmIncidencia = useCallback(
    async (id: string, userId: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      const currentList = inc?.verifiedByList || [];
      const newList = currentList.includes(userId) ? currentList : [...currentList, userId];
      await updateDoc(ref, {
        status: IncidenciaStatus.VERIFIED,
        verifiedByList: newList,
        history: [
          ...(inc?.history || []).map((h) => ({
            id: h.id, action: h.action, performedBy: h.performedBy, performedAt: h.performedAt, note: h.note || null,
          })) || [],
          {
            id: Date.now().toString(),
            action: 'Incidencia verificada',
            performedBy: userId,
            performedAt: new Date().toISOString(),
          },
        ],
      });
    },
    [incidencias]
  );

  // Agregar viewer
  const addViewer = useCallback(
    async (id: string, userId: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      const currentViewers = inc?.viewers || [];
      if (currentViewers.includes(userId)) return;
      await updateDoc(ref, {
        viewers: arrayUnion(userId),
      });
    },
    [incidencias]
  );

  // Resolver incidencia (VERIFIED -> RESOLVED)
  const resolveIncidencia = useCallback(
    async (id: string, userId: string, resolution?: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      await updateDoc(ref, {
        status: IncidenciaStatus.RESOLVED,
        resolvedBy: userId,
        resolvedAt: serverTimestamp(),
        notes: [
          ...(inc?.notes || []),
          ...(resolution
            ? [
                {
                  id: Date.now().toString(),
                  content: `Resolucion: ${resolution}`,
                  createdBy: userId,
                  createdAt: new Date().toISOString(),
                },
              ]
            : []),
        ],
        history: [
          ...(inc?.history || []).map((h) => ({
            id: h.id, action: h.action, performedBy: h.performedBy, performedAt: h.performedAt, note: h.note || null,
          })) || [],
          {
            id: Date.now().toString(),
            action: 'Incidencia resuelta',
            performedBy: userId,
            performedAt: new Date().toISOString(),
            note: resolution || undefined,
          },
        ],
      });
    },
    [incidencias]
  );

  // Cerrar incidencia (VERIFIED/RESOLVED -> CLOSED)
  const closeIncidencia = useCallback(
    async (id: string, userId: string, reason?: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      await updateDoc(ref, {
        status: IncidenciaStatus.CLOSED,
        closedBy: userId,
        closedAt: serverTimestamp(),
        history: [
          ...(inc?.history || []).map((h) => ({
            id: h.id, action: h.action, performedBy: h.performedBy, performedAt: h.performedAt, note: h.note || null,
          })) || [],
          {
            id: Date.now().toString(),
            action: 'Incidencia cerrada',
            performedBy: userId,
            performedAt: new Date().toISOString(),
            note: reason || undefined,
          },
        ],
      });
    },
    [incidencias]
  );

  // Reabrir incidencia (CLOSED -> REOPENED)
  const reopenIncidencia = useCallback(
    async (id: string, userId: string, reason?: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      await updateDoc(ref, {
        status: IncidenciaStatus.REOPENED,
        verifiedByList: [],
        verifiedBy: null,
        reopenedBy: userId,
        reopenedAt: serverTimestamp(),
        reopenReason: reason || undefined,
        history: [
          ...(inc?.history || []).map((h) => ({
            id: h.id, action: h.action, performedBy: h.performedBy, performedAt: h.performedAt, note: h.note || null,
          })) || [],
          {
            id: Date.now().toString(),
            action: 'Incidencia reabierta',
            performedBy: userId,
            performedAt: new Date().toISOString(),
            note: reason || undefined,
          },
        ],
      });
    },
    [incidencias]
  );

  // Agregar nota
  const addNote = useCallback(
    async (id: string, content: string, userId: string) => {
      const ref = doc(db, 'incidencias', id);
      const inc = incidencias.find((i) => i.id === id);
      await updateDoc(ref, {
        notes: [
          ...(inc?.notes || []),
          {
            id: Date.now().toString(),
            content,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          },
        ],
        history: [
          ...(inc?.history || []).map((h) => ({
            id: h.id, action: h.action, performedBy: h.performedBy, performedAt: h.performedAt, note: h.note || null,
          })) || [],
          {
            id: Date.now().toString(),
            action: 'Nota agregada',
            performedBy: userId,
            performedAt: new Date().toISOString(),
          },
        ],
      });
    },
    [incidencias]
  );

  // Get counts
  const getCounts = useCallback(() => {
    return {
      total: incidencias.length,
      new: incidencias.filter((i) => i.status === IncidenciaStatus.NEW).length,
      open: incidencias.filter((i) => i.status === IncidenciaStatus.OPEN).length,
      verified: incidencias.filter((i) => i.status === IncidenciaStatus.VERIFIED).length,
      resolved: incidencias.filter((i) => i.status === IncidenciaStatus.RESOLVED).length,
      closed: incidencias.filter((i) => i.status === IncidenciaStatus.CLOSED).length,
      reopened: incidencias.filter((i) => i.status === IncidenciaStatus.REOPENED).length,
    };
  }, [incidencias]);

  return {
    incidencias,
    loading,
    error,
    createIncidencia,
    confirmIncidencia,
    resolveIncidencia,
    closeIncidencia,
    reopenIncidencia,
    addNote,
    addViewer,
    getCounts,
  };
}
