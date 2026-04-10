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
  DocumentData
} from 'firebase/firestore';
import { db } from '../../firebase-config';

export interface Solicitud {
  id?: string;
  tipo: 'cambio' | 'intercambio';
  de: string;
  deId: string;
  a: string;
  aId: string;
  deCargo?: string;
  aCargo?: string;
  deDept?: string;
  aDept?: string;
  deTurnoActual?: string;
  deTurnoNuevo?: string;
  deHorarioActual?: string;
  deHorarioNuevo?: string;
  aTurnoActual?: string;
  aTurnoNuevo?: string;
  aHorarioActual?: string;
  aHorarioNuevo?: string;
  fecha: string;
  fechaSolicitud: string;
  fechaRespuesta?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'deshecha';
  avatar: string;
  historial?: HistorialItem[];
}

export interface HistorialItem {
  fecha: string;
  accion: string;
  usuario: string;
  motivo?: string;
}

const COLLECTION_NAME = 'solicitudes';

export function useFirestoreSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('fechaSolicitud', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Solicitud[];
        setSolicitudes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar solicitudes:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear nueva solicitud
  const createSolicitud = useCallback(async (solicitud: Omit<Solicitud, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...solicitud,
        fechaSolicitud: new Date().toISOString(),
        historial: [{
          fecha: new Date().toISOString(),
          accion: 'Solicitud creada',
          usuario: solicitud.de
        }]
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear solicitud:', err);
      throw err;
    }
  }, []);

  // Actualizar solicitud
  const updateSolicitud = useCallback(async (id: string, updates: Partial<Solicitud>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updates as DocumentData);
    } catch (err) {
      console.error('Error al actualizar solicitud:', err);
      throw err;
    }
  }, []);

  // Aceptar solicitud
  const acceptSolicitud = useCallback(async (id: string, userName: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();
      await updateDoc(docRef, {
        estado: 'aceptada',
        fechaRespuesta: now,
        historial: [
          ...(solicitudes.find(s => s.id === id)?.historial || []),
          { fecha: now, accion: 'Solicitud aceptada', usuario: userName }
        ]
      });
    } catch (err) {
      console.error('Error al aceptar solicitud:', err);
      throw err;
    }
  }, [solicitudes]);

  // Rechazar solicitud
  const rejectSolicitud = useCallback(async (id: string, userName: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();
      await updateDoc(docRef, {
        estado: 'rechazada',
        fechaRespuesta: now,
        historial: [
          ...(solicitudes.find(s => s.id === id)?.historial || []),
          { fecha: now, accion: 'Solicitud rechazada', usuario: userName }
        ]
      });
    } catch (err) {
      console.error('Error al rechazar solicitud:', err);
      throw err;
    }
  }, [solicitudes]);

  // Deshacer cambio
  const undoSolicitud = useCallback(async (id: string, userName: string, motivo: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();
      await updateDoc(docRef, {
        estado: 'deshecha',
        historial: [
          ...(solicitudes.find(s => s.id === id)?.historial || []),
          { fecha: now, accion: 'Cambio deshecho por supervisor', usuario: userName, motivo }
        ]
      });
    } catch (err) {
      console.error('Error al deshacer solicitud:', err);
      throw err;
    }
  }, [solicitudes]);

  // Eliminar solicitud
  const deleteSolicitud = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.error('Error al eliminar solicitud:', err);
      throw err;
    }
  }, []);

  return {
    solicitudes,
    loading,
    error,
    createSolicitud,
    updateSolicitud,
    acceptSolicitud,
    rejectSolicitud,
    undoSolicitud,
    deleteSolicitud
  };
}
