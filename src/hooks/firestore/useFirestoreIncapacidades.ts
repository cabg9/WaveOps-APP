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
  DocumentData,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../firebase-config';
import { Department } from '@/types';

export interface IncapacidadDocument {
  id: string;
  name: string;
  uploaded: boolean;
  url?: string;
  fileUrls?: string[];
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
  userDepartment: Department;
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
  replacementUserDept?: Department;
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
            return {
              id: doc.id,
              ...docData
            };
          }) as Incapacidad[];
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
    } catch (err: any) {
      console.error('Error al inicializar incapacidades:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, []);

  // Crear nueva incapacidad
  const createIncapacidad = useCallback(async (incapacidad: Omit<Incapacidad, 'id'>) => {
    try {
      const now = new Date().toISOString();
      const initialHistoryEntry = {
        date: now,
        action: 'Incapacidad registrada',
        user: incapacidad.userName
      };
      
      // Combinar el history inicial con el que viene del objeto
      const combinedHistory = incapacidad.history?.length > 0 
        ? [...incapacidad.history, initialHistoryEntry]
        : [initialHistoryEntry];
      
      // Asegurar que notes y documents sean arrays
      const dataToSave = {
        ...incapacidad,
        notes: incapacidad.notes || [],
        documents: incapacidad.documents || [],
        createdAt: now,
        history: combinedHistory
      };
      
      console.log('DEBUG - Creando incapacidad:', dataToSave);
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
      console.log('DEBUG - Incapacidad creada con ID:', docRef.id);
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

      const now = new Date().toISOString();

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        verifiedBy: arrayUnion(userId),
        status: 'verificada',
        history: arrayUnion({ date: now, action: `Verificado por ${userName}`, user: userName })
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
        history: arrayUnion({ date: now, action: 'Incapacidad registrada en RRHH', user: userName })
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
  const rejectIncapacidad = useCallback(async (id: string, reason: string, userId: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();

      await updateDoc(docRef, {
        status: 'rechazada',
        rejectionReason: reason,
        notes: arrayUnion({ id: Date.now().toString(), text: `Motivo de rechazo: ${reason}`, date: now, user: userId }),
        history: arrayUnion({ date: now, action: `Incapacidad rechazada: ${reason}`, user: userId })
      });
    } catch (err) {
      console.error('Error al rechazar incapacidad:', err);
      throw err;
    }
  }, [incapacidades]);

  // Deshacer incapacidad
  const undoIncapacidad = useCallback(async (id: string, reason: string, userId: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();

      await updateDoc(docRef, {
        status: 'pendiente',
        history: arrayUnion({ date: now, action: `Incapacidad deshecha: ${reason}`, user: userId })
      });
    } catch (err) {
      console.error('Error al deshacer incapacidad:', err);
      throw err;
    }
  }, [incapacidades]);

  // Agregar nota (versión simple con text y user)
  const addNote = useCallback(async (id: string, text: string, user: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        notes: arrayUnion({ 
          id: Date.now().toString(),
          text, 
          user,
          date: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Error al agregar nota:', err);
      throw err;
    }
  }, [incapacidades]);

  // Agregar documento (versión simple - solo nombre)
  const addDocument = useCallback(async (id: string, docName: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        documents: arrayUnion({
          id: `doc${Date.now()}`,
          name: docName,
          requested: true,
          uploaded: false,
          fileUrls: []
        })
      });
    } catch (err) {
      console.error('Error al agregar documento:', err);
      throw err;
    }
  }, [incapacidades]);

  // Actualizar documento (marcar como subido con URLs)
  const updateDocument = useCallback(async (id: string, docId: string, fileUrls: string[]) => {
    try {
      console.log('updateDocument called', { id, docId, fileUrls });
      
      const incapacidad = incapacidades.find(i => i.id === id);
      if (!incapacidad) {
        console.error('Incapacidad no encontrada:', id);
        throw new Error('Incapacidad no encontrada');
      }
      
      console.log('Incapacidad encontrada:', incapacidad);
      console.log('Documentos actuales:', incapacidad.documents);

      const docRef = doc(db, COLLECTION_NAME, id);
      const now = new Date().toISOString();
      
      // Filtrar solo URLs que no sean blobs (Firestore no acepta blobs)
      const validUrls = fileUrls.filter(url => !url.startsWith('blob:'));
      console.log('URLs válidas:', validUrls);
      
      // Encontrar el documento y actualizarlo
      const updatedDocuments = incapacidad.documents.map(d => 
        d.id === docId 
          ? { ...d, uploaded: true, fileUrls: [...(d.fileUrls || []), ...validUrls] }
          : d
      );
      
      console.log('Documentos actualizados:', updatedDocuments);

      await updateDoc(docRef, {
        documents: updatedDocuments,
        history: arrayUnion({ 
          date: now, 
          action: `Documento subido: ${validUrls.length} archivo(s)`, 
          user: 'Usuario' 
        })
      });
      
      console.log('Documento actualizado en Firestore');
    } catch (err) {
      console.error('Error al actualizar documento:', err);
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
    undoIncapacidad,
    addNote,
    addDocument,
    updateDocument,
    deleteIncapacidad
  };
}
