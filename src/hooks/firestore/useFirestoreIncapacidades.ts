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
import { db } from '../firebase-config';

export interface IncapacidadDocument {
  id: string;
  name: string;
  uploaded: boolean;
  url?: string;
}

export interface IncapacidadNote {
  id: string;
  text: string;
  date: string;
  user: string;
}

export interface IncapacidadHistoryItem {
  date: string;
  action: string;
  user: string;
}

export interface Incapacidad {
  id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment: string;
  type: string;
  startDate: string;
  endDate: string;
  description: string;
  status: 'pendiente' | 'verificada' | 'registrada' | 'rechazada';
  history: IncapacidadHistoryItem[];
  notes: IncapacidadNote[];
  documents: IncapacidadDocument[];
  createdAt: string;
  replacementUserId?: string;
  replacementUserName?: string;
  replacementUserDept?: string;
  isExternalSupport?: boolean;
  rejectionReason?: string;
  verifiedBy?: string[];
}

const COLLECTION_NAME = 'incapacidades';

export function useFirestoreIncapacidades() {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Incapacidad[];
        setIncapacidades(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al cargar incapacidades:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear nueva incapacidad
  const createIncapacidad = useCallback(async (incapacidad: Omit<Incapacidad, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...incapacidad,
        createdAt: new Date().toISOString(),
        history: [{
          date: new Date().toISOString(),
          action: 'Incapacidad registrada',
          user: incapacidad.userName
        }]
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear incapacidad:', err);
      throw err;
    }
  }, []);

  // Actualizar incapacidad
  const updateIncapacidad = useCallback(async (id: string, updates: Partial<Incapacidad>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updates as DocumentData);
    } catch (err) {
      console.error('Error al actualizar incapacidad:', err);
      throw err;
    }
  }, []);

  // Verificar incapacidad
  const verifyIncapacidad = useCallback(async (id: string, userId: string, userName: string) => {
    try {
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) return;

      const currentVerifiers = incapacidad.verifiedBy || [];
      if (currentVerifiers.includes(userId)) return;

      const newVerifiers = [...currentVerifiers, userId];
      const now = new Date().toISOString();

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        verifiedBy: newVerifiers,
        status: 'verificada',
        history: [
          ...incapacidad.history,
          { date: now, action: `Verificado por ${userName}`, user: userName }
        ]
      });
    } catch (err) {
      console.error('Error al verificar incapacidad:', err);
      throw err;
    }
  }, [incapacidades]);

  // Registrar incapacidad
  const registerIncapacidad = useCallback(async (id: string, userName: string, replacementData?: {
    replacementUserId: string;
    replacementUserName: string;
    replacementUserDept: string;
    isExternalSupport: boolean;
  }) => {
    try {
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) return;

      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, id);

      const updates: any = {
        status: 'registrada',
        history: [
          ...incapacidad.history,
          { date: now, action: 'Incapacidad registrada en RRHH', user: userName }
        ]
      };

      if (replacementData) {
        updates.replacementUserId = replacementData.replacementUserId;
        updates.replacementUserName = replacementData.replacementUserName;
        updates.replacementUserDept = replacementData.replacementUserDept;
        updates.isExternalSupport = replacementData.isExternalSupport;
      }

      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('Error al registrar incapacidad:', err);
      throw err;
    }
  }, [incapacidades]);

  // Rechazar incapacidad
  const rejectIncapacidad = useCallback(async (id: string, userName: string, reason: string) => {
    try {
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) return;

      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, id);

      await updateDoc(docRef, {
        status: 'rechazada',
        rejectionReason: reason,
        history: [
          ...incapacidad.history,
          { date: now, action: 'Incapacidad rechazada', user: userName }
        ]
      });
    } catch (err) {
      console.error('Error al rechazar incapacidad:', err);
      throw err;
    }
  }, [incapacidades]);

  // Agregar nota
  const addNote = useCallback(async (id: string, note: Omit<IncapacidadNote, 'id'>) => {
    try {
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) return;

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        notes: [...incapacidad.notes, { ...note, id: Date.now().toString() }]
      });
    } catch (err) {
      console.error('Error al agregar nota:', err);
      throw err;
    }
  }, [incapacidades]);

  // Agregar documento
  const addDocument = useCallback(async (id: string, document: IncapacidadDocument) => {
    try {
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) return;

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        documents: [...incapacidad.documents, document]
      });
    } catch (err) {
      console.error('Error al agregar documento:', err);
      throw err;
    }
  }, [incapacidades]);

  // Eliminar incapacidad
  const deleteIncapacidad = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.error('Error al eliminar incapacidad:', err);
      throw err;
    }
  }, []);

  return {
    incapacidades,
    loading,
    error,
    createIncapacidad,
    updateIncapacidad,
    verifyIncapacidad,
    registerIncapacidad,
    rejectIncapacidad,
    addNote,
    addDocument,
    deleteIncapacidad
  };
}
